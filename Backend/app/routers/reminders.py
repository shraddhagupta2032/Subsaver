from datetime import datetime, time, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(tags=["Reminders"])


@router.get("", response_model=List[schemas.ReminderResponse])
@router.get("/", response_model=List[schemas.ReminderResponse], include_in_schema=False)
def get_user_reminders(
    status: Optional[str] = Query(None, description="Filter by status (PENDING, READ)"),
    reminder_type: Optional[str] = Query(None, description="Filter by reminder_type (SUBSCRIPTION_RENEWAL, EXPENSE_PAYMENT)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Reminder).filter(
        models.Reminder.user_id == current_user.id
    )

    if status:
        query = query.filter(models.Reminder.status == status.strip().upper())

    if reminder_type:
        query = query.filter(models.Reminder.reminder_type == reminder_type.strip().upper())

    reminders = query.order_by(models.Reminder.reminder_date.asc()).all()
    return reminders


@router.get("/{reminder_id}", response_model=schemas.ReminderResponse)
def get_reminder_by_id(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )

    if reminder.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this reminder"
        )

    return reminder


@router.post("/read-all", response_model=dict)
def mark_all_reminders_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    pending_reminders = db.query(models.Reminder).filter(
        models.Reminder.user_id == current_user.id,
        models.Reminder.status == "PENDING"
    ).all()

    for r in pending_reminders:
        r.status = "READ"
        r.read_at = now

    db.commit()
    return {"message": "All reminders marked as read", "updated_count": len(pending_reminders)}


@router.post("/{reminder_id}/read", response_model=schemas.ReminderResponse)

def mark_reminder_as_read(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )

    if reminder.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this reminder"
        )

    reminder.status = "READ"
    reminder.read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(reminder)

    return reminder


@router.post("/{reminder_id}/unread", response_model=schemas.ReminderResponse)
def mark_reminder_as_unread(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )

    if reminder.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this reminder"
        )

    reminder.status = "PENDING"
    reminder.read_at = None

    db.commit()
    db.refresh(reminder)

    return reminder


@router.post("/subscription/{subscription_id}", response_model=schemas.ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_subscription_reminder(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    subscription = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    if subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create reminders for this subscription"
        )

    # Convert next_renewal_date to timezone-aware UTC datetime
    reminder_dt = datetime.combine(subscription.next_renewal_date, time.min).replace(tzinfo=timezone.utc)

    # Duplicate check: check if pending reminder already exists for same subscription & date
    existing_reminder = db.query(models.Reminder).filter(
        models.Reminder.user_id == current_user.id,
        models.Reminder.subscription_id == subscription.id,
        models.Reminder.reminder_date == reminder_dt,
        models.Reminder.status == "PENDING"
    ).first()

    if existing_reminder:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending reminder for this subscription renewal date already exists"
        )

    new_reminder = models.Reminder(
        user_id=current_user.id,
        reminder_type="SUBSCRIPTION_RENEWAL",
        title=f"{subscription.name} subscription renewal",
        message=f"Your {subscription.name} subscription of {subscription.currency} {subscription.amount} renews on {subscription.next_renewal_date}.",
        reminder_date=reminder_dt,
        status="PENDING",
        subscription_id=subscription.id,
        expense_split_id=None
    )

    db.add(new_reminder)
    db.commit()
    db.refresh(new_reminder)

    return new_reminder


@router.post("/expense/{split_id}", response_model=schemas.ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_expense_reminder(
    split_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    split = db.query(models.ExpenseSplit).filter(models.ExpenseSplit.id == split_id).first()
    if not split:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense split not found"
        )

    if split.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create reminders for your own expense splits"
        )

    if split.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create reminder for an already paid expense split"
        )

    expense = db.query(models.Expense).filter(models.Expense.id == split.expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Determine target date: promised_payment_date > expense.due_date
    target_date = split.promised_payment_date or expense.due_date
    if not target_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payment date available for this reminder. Please set a promised payment date or expense due date."
        )

    # Convert target date to timezone-aware UTC datetime
    reminder_dt = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)

    # Duplicate check: check if pending reminder already exists for same split & date
    existing_reminder = db.query(models.Reminder).filter(
        models.Reminder.user_id == current_user.id,
        models.Reminder.expense_split_id == split.id,
        models.Reminder.reminder_date == reminder_dt,
        models.Reminder.status == "PENDING"
    ).first()

    if existing_reminder:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending reminder for this expense payment date already exists"
        )

    new_reminder = models.Reminder(
        user_id=current_user.id,
        reminder_type="EXPENSE_PAYMENT",
        title=f"Payment due for {expense.title}",
        message=f"You owe INR {split.amount_owed} for {expense.title}.",
        reminder_date=reminder_dt,
        status="PENDING",
        subscription_id=None,
        expense_split_id=split.id
    )

    db.add(new_reminder)
    db.commit()
    db.refresh(new_reminder)

    return new_reminder
