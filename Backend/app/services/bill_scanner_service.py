import os
import uuid
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Optional, List, Any, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app import models, schemas
from app.services.ai import gemini_service
from app.routers import expenses, subscriptions, shared_subscriptions

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/jpg"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
TWO_PLACES = Decimal("0.01")


def validate_uploaded_image(file_bytes: bytes, filename: str, content_type: Optional[str]):
    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        )

    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
        )

    if content_type:
        clean_mime = content_type.split(";")[0].strip().lower()
        if clean_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported content type '{content_type}'. Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
            )


def parse_date_safe(val: Any) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        val = val.strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                continue
    return None


def parse_decimal_safe(val: Any) -> Optional[Decimal]:
    if val is None:
        return None
    try:
        clean_val = str(val).replace(",", "").replace("₹", "").replace("$", "").strip()
        dec = Decimal(clean_val)
        return dec.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        return None


def scan_bill_image(
    file_bytes: bytes,
    filename: str,
    content_type: Optional[str]
) -> schemas.BillScanResponse:
    validate_uploaded_image(file_bytes, filename, content_type)

    mime_to_send = (content_type or "image/jpeg").split(";")[0].strip().lower()
    raw_data = gemini_service.extract_bill_data_from_image(file_bytes, mime_to_send)

    warnings: List[str] = []

    # 1. Merchant Name
    merchant = raw_data.get("merchant_name")
    if merchant and isinstance(merchant, str):
        merchant = merchant.strip() or None
    else:
        merchant = None
    if not merchant:
        warnings.append("Merchant/service name could not be confidently identified.")

    # 2. Total Amount
    amount = parse_decimal_safe(raw_data.get("total_amount"))
    if amount is not None and amount <= Decimal("0.00"):
        warnings.append(f"Extracted amount INR {amount} is non-positive; ignored.")
        amount = None
    if amount is None:
        warnings.append("Total monetary amount could not be determined.")

    # 3. Currency
    currency = raw_data.get("currency")
    if currency and isinstance(currency, str):
        currency = currency.strip().upper()
    else:
        currency = "INR"

    # 4. Dates
    bill_date = parse_date_safe(raw_data.get("bill_date"))
    due_date = parse_date_safe(raw_data.get("due_date"))
    next_renewal_date = parse_date_safe(raw_data.get("next_renewal_date"))

    if not due_date:
        warnings.append("Could not confidently determine the payment due date.")

    # 5. Billing Cycle
    cycle = raw_data.get("billing_cycle")
    if cycle and isinstance(cycle, str):
        cycle = cycle.strip().upper()
        if cycle not in schemas.VALID_SHARED_SUB_CYCLES:
            warnings.append(f"Extracted billing cycle '{cycle}' is invalid and was cleared.")
            cycle = None
    else:
        cycle = None

    # 6. Document Type
    doc_type = raw_data.get("document_type")
    if doc_type and isinstance(doc_type, str):
        doc_type = doc_type.strip().upper()
        if doc_type not in schemas.VALID_DOCUMENT_TYPES:
            doc_type = "UNKNOWN"
    else:
        doc_type = "UNKNOWN"

    if doc_type == "UNKNOWN":
        warnings.append("Document could not be classified automatically. Please select Expense or Subscription.")

    # 7. Confidence
    raw_conf = raw_data.get("confidence")
    confidence = parse_decimal_safe(raw_conf)
    if confidence is None or confidence < Decimal("0.0") or confidence > Decimal("1.0"):
        confidence = Decimal("0.80")

    category = raw_data.get("category")
    if category and isinstance(category, str):
        category = category.strip() or None
    else:
        category = None

    description = raw_data.get("description")
    if description and isinstance(description, str):
        description = description.strip() or None
    else:
        description = None

    extracted = schemas.BillScanExtractedData(
        merchant_name=merchant,
        total_amount=amount,
        currency=currency,
        bill_date=bill_date,
        due_date=due_date,
        category=category,
        description=description,
        billing_cycle=cycle,
        next_renewal_date=next_renewal_date,
        document_type=doc_type,
        confidence=confidence
    )

    # Determine status
    if merchant and amount and confidence >= Decimal("0.50"):
        scan_status = "SUCCESS"
    elif merchant or amount:
        scan_status = "PARTIAL"
    else:
        scan_status = "FAILED"

    scan_id = f"scan_{uuid.uuid4().hex[:12]}"

    return schemas.BillScanResponse(
        scan_id=scan_id,
        status=scan_status,
        extracted_data=extracted,
        warnings=warnings
    )


def confirm_and_create_financial_record(
    db: Session,
    current_user: models.User,
    confirm_req: schemas.BillScanConfirmRequest
) -> schemas.BillScanConfirmResponse:
    creation_type = confirm_req.creation_type.strip().upper()

    if creation_type == "EXPENSE":
        if not confirm_req.expense_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="expense_data is required when creation_type is 'EXPENSE'"
            )
        created_expense = expenses.create_expense(
            expense_in=confirm_req.expense_data,
            db=db,
            current_user=current_user
        )
        return schemas.BillScanConfirmResponse(
            creation_type="EXPENSE",
            created_record_id=created_expense.id,
            message="Expense created successfully from bill scan draft.",
            expense=created_expense
        )

    elif creation_type == "SUBSCRIPTION":
        if not confirm_req.subscription_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="subscription_data is required when creation_type is 'SUBSCRIPTION'"
            )
        created_sub = subscriptions.create_subscription(
            sub_in=confirm_req.subscription_data,
            db=db,
            current_user=current_user
        )
        return schemas.BillScanConfirmResponse(
            creation_type="SUBSCRIPTION",
            created_record_id=created_sub.id,
            message="Personal subscription created successfully from bill scan draft.",
            subscription=created_sub
        )

    elif creation_type == "SHARED_SUBSCRIPTION":
        if not confirm_req.shared_subscription_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="shared_subscription_data is required when creation_type is 'SHARED_SUBSCRIPTION'"
            )
        if not confirm_req.group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="group_id is required when creation_type is 'SHARED_SUBSCRIPTION'"
            )
        created_shared_sub = shared_subscriptions.create_shared_subscription(
            group_id=confirm_req.group_id,
            sub_in=confirm_req.shared_subscription_data,
            db=db,
            current_user=current_user
        )
        return schemas.BillScanConfirmResponse(
            creation_type="SHARED_SUBSCRIPTION",
            created_record_id=created_shared_sub.id,
            message="Shared group subscription created successfully from bill scan draft.",
            shared_subscription=created_shared_sub
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported creation_type '{creation_type}'"
        )
