from datetime import date, datetime, time, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import reminder_service

router = APIRouter(tags=["Notifications"])


@router.get("/settings", response_model=schemas.NotificationSettingsResponse)
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    settings = db.query(models.NotificationSetting).filter(
        models.NotificationSetting.user_id == current_user.id
    ).first()

    if not settings:
        settings = models.NotificationSetting(
            user_id=current_user.id,
            subscription_reminders_enabled=True,
            expense_reminders_enabled=True,
            reminder_days_before=3
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/settings", response_model=schemas.NotificationSettingsResponse)
def update_notification_settings(
    settings_in: schemas.NotificationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    settings = db.query(models.NotificationSetting).filter(
        models.NotificationSetting.user_id == current_user.id
    ).first()

    if not settings:
        settings = models.NotificationSetting(
            user_id=current_user.id,
            subscription_reminders_enabled=True,
            expense_reminders_enabled=True,
            reminder_days_before=3
        )
        db.add(settings)

    if settings_in.subscription_reminders_enabled is not None:
        settings.subscription_reminders_enabled = settings_in.subscription_reminders_enabled
    if settings_in.expense_reminders_enabled is not None:
        settings.expense_reminders_enabled = settings_in.expense_reminders_enabled
    if settings_in.reminder_days_before is not None:
        settings.reminder_days_before = settings_in.reminder_days_before

    db.commit()
    db.refresh(settings)

    return settings


@router.post("/process")
def process_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return reminder_service.process_all_reminders(db)


@router.get("/upcoming", response_model=List[schemas.ReminderResponse])
def get_upcoming_notifications(
    days: int = Query(7, gt=0, le=30, description="Number of days forward to check (1-30)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()
    max_date = today + timedelta(days=days)

    today_dt = datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    max_dt = datetime.combine(max_date, time.max).replace(tzinfo=timezone.utc)

    reminders = db.query(models.Reminder).filter(
        models.Reminder.user_id == current_user.id,
        models.Reminder.status == "PENDING",
        models.Reminder.reminder_date >= today_dt,
        models.Reminder.reminder_date <= max_dt
    ).order_by(models.Reminder.reminder_date.asc()).all()

    return reminders


@router.post("/{reminder_id}/sent", response_model=schemas.ReminderResponse)
def mark_notification_sent(
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

    if reminder.notification_sent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification already marked as sent"
        )

    reminder.notification_sent = True
    reminder.notification_sent_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(reminder)

    return reminder
