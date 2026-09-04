from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import bill_scanner_service

router = APIRouter(prefix="/bill-scanner", tags=["AI Bill Scanner"])


@router.post("/scan", response_model=schemas.BillScanResponse, status_code=status.HTTP_200_OK)
async def scan_bill_document(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    file_bytes = await file.read()
    return bill_scanner_service.scan_bill_image(
        file_bytes=file_bytes,
        filename=file.filename or "uploaded_bill.jpg",
        content_type=file.content_type
    )


@router.post("/confirm", response_model=schemas.BillScanConfirmResponse, status_code=status.HTTP_201_CREATED)
def confirm_bill_scan_draft(
    confirm_req: schemas.BillScanConfirmRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return bill_scanner_service.confirm_and_create_financial_record(
        db=db,
        current_user=current_user,
        confirm_req=confirm_req
    )
