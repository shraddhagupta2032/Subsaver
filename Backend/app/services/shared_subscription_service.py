from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app import models, schemas

TWO_PLACES = Decimal("0.01")


def to_decimal_2(val) -> Decimal:
    if not isinstance(val, Decimal):
        val = Decimal(str(val))
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_shared_sub_splits(total_amount: Decimal, user_ids: List[int]) -> List[Tuple[int, Decimal]]:
    if not user_ids:
        return []

    total_amount = to_decimal_2(total_amount)
    total_cents = int(total_amount * 100)
    n = len(user_ids)
    base_cents = total_cents // n
    remainder = total_cents % n

    splits: List[Tuple[int, Decimal]] = []
    for i, u_id in enumerate(user_ids):
        extra = 1 if i < remainder else 0
        cents = base_cents + extra
        share = (Decimal(cents) / Decimal(100)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        splits.append((u_id, share))

    return splits


def advance_renewal_date(current_date: date, billing_cycle: str) -> date:
    cycle = billing_cycle.strip().upper()
    if cycle == "MONTHLY":
        year = current_date.year
        month = current_date.month + 1
        if month > 12:
            month = 1
            year += 1

        if month in (1, 3, 5, 7, 8, 10, 12):
            max_days = 31
        elif month in (4, 6, 9, 11):
            max_days = 30
        else:
            is_leap = (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0))
            max_days = 29 if is_leap else 28

        day = min(current_date.day, max_days)
        return date(year, month, day)

    elif cycle == "YEARLY":
        year = current_date.year + 1
        month = current_date.month
        day = current_date.day
        if month == 2 and day == 29:
            is_leap = (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0))
            if not is_leap:
                day = 28
        return date(year, month, day)

    elif cycle == "WEEKLY":
        return current_date + timedelta(days=7)

    elif cycle == "CUSTOM":
        return current_date + timedelta(days=30)

    else:
        raise ValueError(f"Unsupported billing cycle: {billing_cycle}")


def format_shared_subscription_response(
    sub: models.SharedSubscription,
    db: Session
) -> schemas.SharedSubscriptionResponse:
    group = db.query(models.Group).filter(models.Group.id == sub.group_id).first()
    creator = db.query(models.User).filter(models.User.id == sub.created_by).first()
    payer = db.query(models.User).filter(models.User.id == sub.payer_id).first()

    member_responses: List[schemas.SharedSubscriptionMemberResponse] = []
    for m in sub.members:
        u = m.user or db.query(models.User).filter(models.User.id == m.user_id).first()
        member_responses.append(
            schemas.SharedSubscriptionMemberResponse(
                id=m.id,
                user_id=m.user_id,
                user_name=u.name if u else "",
                user_email=u.email if u else "",
                share_amount=to_decimal_2(Decimal(str(m.share_amount)))
            )
        )

    return schemas.SharedSubscriptionResponse(
        id=sub.id,
        group_id=sub.group_id,
        group_name=group.name if group else "",
        created_by=sub.created_by,
        creator_name=creator.name if creator else "",
        payer_id=sub.payer_id,
        payer_name=payer.name if payer else "",
        name=sub.name,
        total_amount=to_decimal_2(Decimal(str(sub.total_amount))),
        currency=sub.currency,
        billing_cycle=sub.billing_cycle,
        next_renewal_date=sub.next_renewal_date,
        category=sub.category,
        status=sub.status,
        auto_renew_expense=sub.auto_renew_expense,
        notes=sub.notes,
        members=member_responses,
        created_at=sub.created_at,
        updated_at=sub.updated_at
    )


def process_shared_subscription_renewal(
    db: Session,
    subscription: models.SharedSubscription
) -> schemas.SharedSubscriptionRenewalResult:
    if subscription.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot renew shared subscription with status '{subscription.status}'. Status must be ACTIVE."
        )

    if not subscription.members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot renew shared subscription with no members."
        )

    # 1. Create linked Expense
    expense_title = f"{subscription.name} (Renewal {subscription.next_renewal_date})"
    new_expense = models.Expense(
        group_id=subscription.group_id,
        created_by=subscription.payer_id,
        payer_id=subscription.payer_id,
        title=expense_title,
        total_amount=to_decimal_2(Decimal(str(subscription.total_amount))),
        expense_date=subscription.next_renewal_date,
        due_date=subscription.next_renewal_date,
        notes=f"Auto-generated from shared subscription #{subscription.id}"
    )

    db.add(new_expense)
    db.flush()

    # 2. Create ExpenseSplits for each subscription member
    splits_count = 0
    for member in subscription.members:
        split = models.ExpenseSplit(
            expense_id=new_expense.id,
            user_id=member.user_id,
            amount_owed=to_decimal_2(Decimal(str(member.share_amount))),
            amount_paid=Decimal("0.00"),
            status="PENDING",
            promised_payment_date=None,
            paid_at=None
        )
        db.add(split)
        splits_count += 1

    # 3. Advance next_renewal_date
    next_date = advance_renewal_date(subscription.next_renewal_date, subscription.billing_cycle)
    subscription.next_renewal_date = next_date

    # Commit all atomically
    db.commit()
    db.refresh(new_expense)
    db.refresh(subscription)

    return schemas.SharedSubscriptionRenewalResult(
        shared_subscription_id=subscription.id,
        generated_expense_id=new_expense.id,
        expense_title=new_expense.title,
        total_amount=to_decimal_2(Decimal(str(new_expense.total_amount))),
        splits_created=splits_count,
        next_renewal_date=subscription.next_renewal_date
    )
