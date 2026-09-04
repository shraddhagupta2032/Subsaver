from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(tags=["Expenses"])


def calculate_equal_splits(total_amount: Decimal, user_ids: List[int]) -> List[Tuple[int, Decimal]]:
    """
    Distributes total_amount equally across user_ids.
    Handles indivisible cents deterministically so sum(shares) == total_amount exactly.
    """
    n = len(user_ids)
    if n == 0:
        return []

    total_cents = int(total_amount * 100)
    base_cents = total_cents // n
    remainder_cents = total_cents % n

    results = []
    for i, uid in enumerate(user_ids):
        cents = base_cents + (1 if i < remainder_cents else 0)
        share = Decimal(cents) / Decimal(100)
        results.append((uid, share))

    return results


def format_expense_response(expense: models.Expense, db: Session) -> schemas.ExpenseResponse:
    # Fetch creator and payer user details
    creator = db.query(models.User).filter(models.User.id == expense.created_by).first()
    payer = db.query(models.User).filter(models.User.id == expense.payer_id).first()
    group = db.query(models.Group).filter(models.Group.id == expense.group_id).first()

    splits_data = []
    for split in expense.splits:
        user = db.query(models.User).filter(models.User.id == split.user_id).first()
        splits_data.append(
            schemas.ExpenseSplitResponse(
                id=split.id,
                expense_id=split.expense_id,
                user_id=split.user_id,
                user_name=user.name if user else "Unknown",
                user_email=user.email if user else "",
                amount_owed=split.amount_owed,
                amount_paid=split.amount_paid,
                status=split.status,
                promised_payment_date=split.promised_payment_date,
                paid_at=split.paid_at,
                created_at=split.created_at
            )
        )

    return schemas.ExpenseResponse(
        id=expense.id,
        group_id=expense.group_id,
        group_name=group.name if group else "",
        created_by=expense.created_by,
        creator_name=creator.name if creator else "Unknown",
        title=expense.title,
        total_amount=expense.total_amount,
        payer_id=expense.payer_id,
        payer_name=payer.name if payer else "Unknown",
        expense_date=expense.expense_date,
        due_date=expense.due_date,
        notes=expense.notes,
        created_at=expense.created_at,
        splits=splits_data
    )


@router.post("", response_model=schemas.ExpenseResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.ExpenseResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_expense(
    expense_in: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Validate title
    title = expense_in.title.strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense title cannot be empty"
        )

    # 2. Validate total_amount > 0
    if expense_in.total_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total amount must be greater than zero"
        )

    # 3. Validate group exists
    group = db.query(models.Group).filter(models.Group.id == expense_in.group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # 4. Validate current user is a member of the group
    is_creator_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == expense_in.group_id,
        models.GroupMember.user_id == current_user.id
    ).first()

    if not is_creator_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the group to create an expense"
        )

    # 5. Get all group member IDs
    group_members = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == expense_in.group_id
    ).all()
    group_member_user_ids = {m.user_id for m in group_members}

    # 6. Validate payer is in group
    if expense_in.payer_id not in group_member_user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payer must be a member of the group"
        )

    # 7. Validate split members
    unique_split_user_ids = list(dict.fromkeys(expense_in.split_user_ids))
    if not unique_split_user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense must have at least one split member"
        )

    for uid in unique_split_user_ids:
        if uid not in group_member_user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Split user with ID {uid} is not a member of this group"
            )

    # 8. Calculate equal splits
    calculated_splits = calculate_equal_splits(expense_in.total_amount, unique_split_user_ids)

    # Verify split sum matches total_amount exactly
    split_sum = sum(share for _, share in calculated_splits)
    if split_sum != expense_in.total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Split shares do not equal total amount"
        )

    # 9. Create Expense record
    new_expense = models.Expense(
        group_id=expense_in.group_id,
        created_by=current_user.id,
        title=title,
        total_amount=expense_in.total_amount,
        payer_id=expense_in.payer_id,
        expense_date=expense_in.expense_date or date.today(),
        due_date=expense_in.due_date,
        notes=expense_in.notes
    )
    db.add(new_expense)
    db.flush()

    # 10. Create ExpenseSplit records
    now_utc = datetime.now(timezone.utc)
    for uid, share_amount in calculated_splits:
        is_payer = (uid == expense_in.payer_id)
        split_record = models.ExpenseSplit(
            expense_id=new_expense.id,
            user_id=uid,
            amount_owed=share_amount,
            amount_paid=share_amount if is_payer else Decimal("0.00"),
            status="PAID" if is_payer else "PENDING",
            paid_at=now_utc if is_payer else None
        )
        db.add(split_record)

    db.commit()
    db.refresh(new_expense)

    return format_expense_response(new_expense, db)


@router.get("", response_model=List[schemas.ExpenseResponse])
@router.get("/", response_model=List[schemas.ExpenseResponse], include_in_schema=False)
def get_expenses(
    group_id: Optional[int] = Query(None, description="Optional group filter"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Find all groups user belongs to
    user_memberships = db.query(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id
    ).all()
    user_group_ids = [m.group_id for m in user_memberships]

    if group_id is not None:
        if group_id not in user_group_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to expenses for this group"
            )
        expenses = db.query(models.Expense).filter(
            models.Expense.group_id == group_id
        ).order_by(models.Expense.created_at.desc()).all()
    else:
        if not user_group_ids:
            return []
        expenses = db.query(models.Expense).filter(
            models.Expense.group_id.in_(user_group_ids)
        ).order_by(models.Expense.created_at.desc()).all()

    return [format_expense_response(exp, db) for exp in expenses]



@router.get("/{expense_id}", response_model=schemas.ExpenseResponse)
def get_expense_by_id(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Verify user belongs to the group of this expense
    is_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == expense.group_id,
        models.GroupMember.user_id == current_user.id
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to view this expense"
        )

    return format_expense_response(expense, db)


def format_split_response(split: models.ExpenseSplit, db: Session) -> schemas.ExpenseSplitResponse:
    user = db.query(models.User).filter(models.User.id == split.user_id).first()
    return schemas.ExpenseSplitResponse(
        id=split.id,
        expense_id=split.expense_id,
        user_id=split.user_id,
        user_name=user.name if user else "Unknown",
        user_email=user.email if user else "",
        amount_owed=split.amount_owed,
        amount_paid=split.amount_paid,
        status=split.status,
        promised_payment_date=split.promised_payment_date,
        paid_at=split.paid_at,
        created_at=split.created_at
    )


@router.post("/{expense_id}/splits/{split_id}/pay", response_model=schemas.ExpenseSplitResponse)
def mark_split_as_paid(
    expense_id: int,
    split_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    split = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.id == split_id,
        models.ExpenseSplit.expense_id == expense_id
    ).first()

    if not split:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense split not found"
        )

    # Only owner can mark their own split as paid
    if split.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark your own split as paid"
        )

    # Reject if already paid
    if split.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This split is already paid"
        )

    # Update payment state
    split.amount_paid = split.amount_owed
    split.status = "PAID"
    split.paid_at = datetime.now(timezone.utc)
    split.promised_payment_date = None

    db.commit()
    db.refresh(split)

    return format_split_response(split, db)


@router.post("/{expense_id}/splits/{split_id}/pay-later", response_model=schemas.ExpenseSplitResponse)
def set_split_pay_later(
    expense_id: int,
    split_id: int,
    pay_later_in: schemas.PayLaterRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    split = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.id == split_id,
        models.ExpenseSplit.expense_id == expense_id
    ).first()

    if not split:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense split not found"
        )

    # Only owner can set pay-later on their own split
    if split.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only set Pay Later on your own split"
        )

    # Reject if already paid
    if split.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot set Pay Later on an already paid split"
        )

    # Validate promised date is not in the past
    if pay_later_in.promised_payment_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promised payment date cannot be in the past"
        )

    # Update split state
    split.status = "PAY_LATER"
    split.promised_payment_date = pay_later_in.promised_payment_date

    db.commit()
    db.refresh(split)

    return format_split_response(split, db)

