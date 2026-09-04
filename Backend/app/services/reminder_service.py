from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy.orm import Session
from app import models


def get_user_notification_settings(db: Session, user_id: int):
    settings = db.query(models.NotificationSetting).filter(
        models.NotificationSetting.user_id == user_id
    ).first()
    if not settings:
        return {
            "subscription_reminders_enabled": True,
            "expense_reminders_enabled": True,
            "reminder_days_before": 3
        }
    return {
        "subscription_reminders_enabled": settings.subscription_reminders_enabled,
        "expense_reminders_enabled": settings.expense_reminders_enabled,
        "reminder_days_before": settings.reminder_days_before
    }


def generate_subscription_reminders(db: Session) -> int:
    today = date.today()
    active_subs = db.query(models.Subscription).filter(
        models.Subscription.status == "ACTIVE"
    ).all()

    created_count = 0

    for sub in active_subs:
        if not sub.next_renewal_date:
            continue

        settings = get_user_notification_settings(db, sub.user_id)
        if not settings["subscription_reminders_enabled"]:
            continue

        days_before = settings["reminder_days_before"]
        trigger_date = sub.next_renewal_date - timedelta(days=days_before)

        # Generate when today is between trigger_date and next_renewal_date
        if trigger_date <= today <= sub.next_renewal_date:
            reminder_dt = datetime.combine(sub.next_renewal_date, time.min).replace(tzinfo=timezone.utc)

            # Check duplicate pending reminder
            existing = db.query(models.Reminder).filter(
                models.Reminder.user_id == sub.user_id,
                models.Reminder.subscription_id == sub.id,
                models.Reminder.reminder_date == reminder_dt,
                models.Reminder.status == "PENDING"
            ).first()

            if not existing:
                new_rem = models.Reminder(
                    user_id=sub.user_id,
                    reminder_type="SUBSCRIPTION_RENEWAL",
                    title=f"{sub.name} subscription renewal",
                    message=f"Your {sub.name} subscription of {sub.currency} {sub.amount} renews on {sub.next_renewal_date}.",
                    reminder_date=reminder_dt,
                    status="PENDING",
                    notification_sent=False,
                    notification_sent_at=None,
                    subscription_id=sub.id,
                    expense_split_id=None
                )
                db.add(new_rem)
                created_count += 1

    return created_count


def generate_expense_reminders(db: Session) -> int:
    today = date.today()
    unpaid_splits = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.status.in_(["PENDING", "PAY_LATER"])
    ).all()

    created_count = 0

    for split in unpaid_splits:
        # Determine payment date
        expense = split.expense
        payment_date = split.promised_payment_date or (expense.due_date if expense else None)

        if not payment_date:
            continue

        settings = get_user_notification_settings(db, split.user_id)
        if not settings["expense_reminders_enabled"]:
            continue

        days_before = settings["reminder_days_before"]
        trigger_date = payment_date - timedelta(days=days_before)

        # Generate when today is between trigger_date and payment_date
        if trigger_date <= today <= payment_date:
            reminder_dt = datetime.combine(payment_date, time.min).replace(tzinfo=timezone.utc)

            # Check duplicate pending reminder
            existing = db.query(models.Reminder).filter(
                models.Reminder.user_id == split.user_id,
                models.Reminder.expense_split_id == split.id,
                models.Reminder.reminder_date == reminder_dt,
                models.Reminder.status == "PENDING"
            ).first()

            if not existing:
                expense_title = expense.title if expense else "Expense"
                new_rem = models.Reminder(
                    user_id=split.user_id,
                    reminder_type="EXPENSE_PAYMENT",
                    title=f"Payment due for {expense_title}",
                    message=f"You owe INR {split.amount_owed} for {expense_title}.",
                    reminder_date=reminder_dt,
                    status="PENDING",
                    notification_sent=False,
                    notification_sent_at=None,
                    subscription_id=None,
                    expense_split_id=split.id
                )
                db.add(new_rem)
                created_count += 1

    return created_count


def process_all_reminders(db: Session) -> dict:
    try:
        sub_count = generate_subscription_reminders(db)
        exp_count = generate_expense_reminders(db)
        db.commit()
        return {
            "subscription_reminders_created": sub_count,
            "expense_reminders_created": exp_count,
            "total_created": sub_count + exp_count
        }
    except Exception:
        db.rollback()
        raise
