from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(tags=["Analytics"])

TWO_PLACES = Decimal("0.01")


def to_decimal_2(val: Decimal) -> Decimal:
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_sub_monthly_yearly(sub: models.Subscription):
    cycle = (sub.billing_cycle or "").upper()
    amount = Decimal(str(sub.amount))
    if cycle == "MONTHLY":
        monthly = amount
        yearly = amount * Decimal("12")
    elif cycle == "YEARLY":
        monthly = amount / Decimal("12")
        yearly = amount
    elif cycle == "WEEKLY":
        monthly = (amount * Decimal("52")) / Decimal("12")
        yearly = amount * Decimal("52")
    else:
        monthly = Decimal("0.00")
        yearly = Decimal("0.00")
    return monthly, yearly


@router.get("/summary", response_model=schemas.FinancialSummaryResponse)
def get_financial_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()
    next_30_days = today + timedelta(days=30)

    # 1. Subscriptions Analytics
    user_subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).all()

    active_subs = [s for s in user_subs if (s.status or "").upper() == "ACTIVE"]
    paused_subs = [s for s in user_subs if (s.status or "").upper() == "PAUSED"]
    cancelled_subs = [s for s in user_subs if (s.status or "").upper() == "CANCELLED"]

    total_monthly = Decimal("0.00")
    total_yearly = Decimal("0.00")

    for s in active_subs:
        m, y = calculate_sub_monthly_yearly(s)
        total_monthly += m
        total_yearly += y

    # Upcoming subscription renewals in next 30 days
    upcoming_subs = [
        s for s in active_subs
        if s.next_renewal_date and today <= s.next_renewal_date <= next_30_days
    ]

    # 2. Expense Splits Analytics for Current User
    user_splits = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.user_id == current_user.id
    ).all()

    total_owed = Decimal("0.00")
    total_paid = Decimal("0.00")
    total_pending = Decimal("0.00")
    total_pay_later = Decimal("0.00")
    upcoming_expense_count = 0

    for split in user_splits:
        owed = Decimal(str(split.amount_owed))
        paid = Decimal(str(split.amount_paid))
        status = (split.status or "").upper()

        total_owed += owed
        total_paid += paid

        if status == "PENDING":
            total_pending += (owed - paid)
        elif status == "PAY_LATER":
            total_pay_later += (owed - paid)

        # Check upcoming due/promised date in next 30 days
        if status in ("PENDING", "PAY_LATER"):
            target_date = split.promised_payment_date or (split.expense.due_date if split.expense else None)
            if target_date and today <= target_date <= next_30_days:
                upcoming_expense_count += 1

    return schemas.FinancialSummaryResponse(
        total_subscription_monthly=to_decimal_2(total_monthly),
        total_subscription_yearly=to_decimal_2(total_yearly),
        total_subscription_active=len(active_subs),
        total_subscription_paused=len(paused_subs),
        total_subscription_cancelled=len(cancelled_subs),
        total_expense_owed=to_decimal_2(total_owed),
        total_expense_paid=to_decimal_2(total_paid),
        total_expense_pending=to_decimal_2(total_pending),
        total_expense_pay_later=to_decimal_2(total_pay_later),
        upcoming_subscription_renewals=len(upcoming_subs),
        upcoming_expense_payments=upcoming_expense_count
    )


@router.get("/subscriptions/categories", response_model=List[schemas.SubscriptionCategorySummary])
def get_subscription_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).all()

    categories_map = defaultdict(lambda: {"count": 0, "monthly": Decimal("0.00"), "yearly": Decimal("0.00")})

    for s in user_subs:
        cat_name = s.category.strip() if s.category and s.category.strip() else "Uncategorized"
        categories_map[cat_name]["count"] += 1

        if (s.status or "").upper() == "ACTIVE":
            m, y = calculate_sub_monthly_yearly(s)
            categories_map[cat_name]["monthly"] += m
            categories_map[cat_name]["yearly"] += y

    results = []
    for cat_name, data in categories_map.items():
        results.append(
            schemas.SubscriptionCategorySummary(
                category=cat_name,
                subscription_count=data["count"],
                monthly_amount=to_decimal_2(data["monthly"]),
                yearly_amount=to_decimal_2(data["yearly"])
            )
        )

    results.sort(key=lambda x: x.monthly_amount, reverse=True)
    return results


@router.get("/subscriptions/upcoming", response_model=List[schemas.UpcomingRenewalResponse])
def get_upcoming_subscriptions(
    days: int = Query(30, gt=0, le=365, description="Number of days forward to check (1-365)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()
    max_date = today + timedelta(days=days)

    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE",
        models.Subscription.next_renewal_date >= today,
        models.Subscription.next_renewal_date <= max_date
    ).order_by(models.Subscription.next_renewal_date.asc()).all()

    return [
        schemas.UpcomingRenewalResponse(
            subscription_id=s.id,
            name=s.name,
            amount=to_decimal_2(Decimal(str(s.amount))),
            currency=s.currency,
            billing_cycle=s.billing_cycle,
            next_renewal_date=s.next_renewal_date,
            category=s.category,
            status=s.status
        )
        for s in subs
    ]


@router.get("/expenses/upcoming", response_model=List[schemas.UpcomingPaymentResponse])
def get_upcoming_expenses(
    days: int = Query(30, gt=0, le=365, description="Number of days forward to check (1-365)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()
    max_date = today + timedelta(days=days)

    user_splits = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.user_id == current_user.id,
        models.ExpenseSplit.status.in_(["PENDING", "PAY_LATER"])
    ).all()

    results = []
    for split in user_splits:
        target_date = split.promised_payment_date or (split.expense.due_date if split.expense else None)
        if target_date and today <= target_date <= max_date:
            owed = Decimal(str(split.amount_owed))
            paid = Decimal(str(split.amount_paid))
            remaining = owed - paid
            expense = split.expense
            group = expense.group if expense else None

            results.append({
                "target_date": target_date,
                "data": schemas.UpcomingPaymentResponse(
                    expense_id=expense.id if expense else 0,
                    expense_title=expense.title if expense else "",
                    group_id=group.id if group else 0,
                    group_name=group.name if group else "",
                    amount_owed=to_decimal_2(owed),
                    amount_paid=to_decimal_2(paid),
                    remaining_amount=to_decimal_2(remaining),
                    status=split.status,
                    due_date=expense.due_date if expense else None,
                    promised_payment_date=split.promised_payment_date
                )
            })

    results.sort(key=lambda x: x["target_date"])
    return [r["data"] for r in results]


@router.get("/groups", response_model=List[schemas.GroupExpenseSummary])
def get_group_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    memberships = db.query(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id
    ).all()

    results = []
    for mem in memberships:
        group = mem.group
        if not group:
            continue

        total_expense = Decimal("0.00")
        total_paid = Decimal("0.00")
        user_pending = Decimal("0.00")

        for exp in group.expenses:
            total_expense += Decimal(str(exp.total_amount))
            for split in exp.splits:
                total_paid += Decimal(str(split.amount_paid))
                if split.user_id == current_user.id and (split.status or "").upper() in ("PENDING", "PAY_LATER"):
                    user_pending += (Decimal(str(split.amount_owed)) - Decimal(str(split.amount_paid)))

        results.append(
            schemas.GroupExpenseSummary(
                group_id=group.id,
                group_name=group.name,
                total_expense=to_decimal_2(total_expense),
                total_paid=to_decimal_2(total_paid),
                current_user_pending_amount=to_decimal_2(user_pending)
            )
        )

    results.sort(key=lambda x: x.total_expense, reverse=True)
    return results


@router.get("/monthly-spending", response_model=schemas.MonthlySpendingResponse)
def get_monthly_spending_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    import calendar
    today = date.today()
    curr_year, curr_month = today.year, today.month

    if curr_month == 1:
        prev_month = 12
        prev_year = curr_year - 1
    else:
        prev_month = curr_month - 1
        prev_year = curr_year

    # 1. Subscriptions monthly burden
    user_subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).all()
    sub_monthly = sum((calculate_sub_monthly_yearly(s)[0] for s in user_subs), start=Decimal("0.00"))

    # Shared subscriptions monthly share for user
    shared_subs = db.query(models.SharedSubscription).filter(
        models.SharedSubscription.status == "ACTIVE"
    ).all()
    for s_sub in shared_subs:
        m_share = next((m for m in s_sub.members if m.user_id == current_user.id), None)
        if m_share:
            cycle = (s_sub.billing_cycle or "").upper()
            share_amt = Decimal(str(m_share.share_amount))
            if cycle == "MONTHLY":
                sub_monthly += share_amt
            elif cycle == "YEARLY":
                sub_monthly += share_amt / Decimal("12")
            elif cycle == "WEEKLY":
                sub_monthly += (share_amt * Decimal("52")) / Decimal("12")

    # 2. User expense splits
    user_splits = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.user_id == current_user.id
    ).all()

    curr_expense_total = Decimal("0.00")
    prev_expense_total = Decimal("0.00")

    # 3. Monthly Trends (last 6 months)
    months_to_check = []
    y, m = curr_year, curr_month
    for _ in range(6):
        months_to_check.append((y, m))
        if m == 1:
            m = 12
            y -= 1
        else:
            m -= 1
    months_to_check.reverse()

    monthly_expense_map = defaultdict(lambda: Decimal("0.00"))

    for split in user_splits:
        exp = split.expense
        if not exp or not exp.expense_date:
            continue
        e_year, e_month = exp.expense_date.year, exp.expense_date.month
        owed = Decimal(str(split.amount_owed))

        if e_year == curr_year and e_month == curr_month:
            curr_expense_total += owed
        elif e_year == prev_year and e_month == prev_month:
            prev_expense_total += owed

        monthly_expense_map[(e_year, e_month)] += owed

    curr_total = to_decimal_2(curr_expense_total + sub_monthly)
    prev_total = to_decimal_2(prev_expense_total + sub_monthly)

    pct_change = None
    is_inc = None
    if prev_total > Decimal("0.00"):
        diff = curr_total - prev_total
        pct = float((diff / prev_total) * Decimal("100"))
        pct_change = round(abs(pct), 1)
        is_inc = diff >= Decimal("0.00")
    elif curr_total > Decimal("0.00"):
        pct_change = 100.0
        is_inc = True

    trends = []
    for y_val, m_val in months_to_check:
        m_spend = to_decimal_2(monthly_expense_map[(y_val, m_val)] + sub_monthly)
        trends.append(
            schemas.MonthlyTrendItem(
                month_name=calendar.month_abbr[m_val],
                month=m_val,
                year=y_val,
                spending=m_spend
            )
        )

    return schemas.MonthlySpendingResponse(
        current_month_spending=curr_total,
        previous_month_spending=prev_total,
        percentage_change=pct_change,
        is_increase=is_inc,
        current_month_name=calendar.month_name[curr_month],
        previous_month_name=calendar.month_name[prev_month],
        trends=trends
    )


@router.get("/categories/spending", response_model=schemas.CategorySpendingResponse)
def get_category_spending_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    categories_map = defaultdict(lambda: {"amount": Decimal("0.00"), "count": 0})

    # Get user's budget categories for smart mapping
    user_budgets = db.query(models.Budget).filter(models.Budget.user_id == current_user.id).all()
    user_budget_cats = [b.category for b in user_budgets if b.category]

    common_cats = ["Food", "Groceries", "Utilities", "Entertainment", "Travel", "Shopping", "Health", "Education"]

    def detect_category(title: str, notes: str) -> str:
        text = f"{(title or '').lower()} {(notes or '').lower()}"
        for bcat in user_budget_cats:
            if bcat.lower() in text:
                return bcat
        for ccat in common_cats:
            if ccat.lower() in text:
                return ccat
        return "General"

    # 1. Expenses splits
    user_splits = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.user_id == current_user.id
    ).all()
    for split in user_splits:
        exp = split.expense
        cat = detect_category(exp.title if exp else "", exp.notes if exp else "")
        owed = Decimal(str(split.amount_owed))
        categories_map[cat]["amount"] += owed
        categories_map[cat]["count"] += 1

    # 2. Subscriptions
    user_subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).all()
    for s in user_subs:
        cat = (s.category if s.category else "Subscriptions").strip() or "Subscriptions"
        m, _ = calculate_sub_monthly_yearly(s)
        categories_map[cat]["amount"] += m
        categories_map[cat]["count"] += 1

    total_spend = sum((c["amount"] for c in categories_map.values()), start=Decimal("0.00"))

    items = []
    for cat_name, data in categories_map.items():
        amt = to_decimal_2(data["amount"])
        pct = float((amt / total_spend * Decimal("100"))) if total_spend > Decimal("0.00") else 0.0
        items.append(
            schemas.CategorySpendingItem(
                category=cat_name,
                amount=amt,
                percentage=round(pct, 1),
                expense_count=data["count"]
            )
        )

    items.sort(key=lambda x: x.amount, reverse=True)
    return schemas.CategorySpendingResponse(
        total_spending=to_decimal_2(total_spend),
        categories=items
    )



@router.get("/group-balances/summary", response_model=schemas.TotalGroupBalancesSummary)
def get_group_balances_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.services import settlement_service
    memberships = db.query(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id
    ).all()

    total_owed = Decimal("0.00")
    total_receivable = Decimal("0.00")

    for mem in memberships:
        balances = settlement_service.calculate_group_balances(db, mem.group_id)
        for mb in balances.member_balances:
            if mb.user_id == current_user.id:
                if mb.net_balance < Decimal("0.00"):
                    total_owed += abs(mb.net_balance)
                elif mb.net_balance > Decimal("0.00"):
                    total_receivable += mb.net_balance

    net_bal = total_receivable - total_owed

    return schemas.TotalGroupBalancesSummary(
        total_owed=to_decimal_2(total_owed),
        total_receivable=to_decimal_2(total_receivable),
        net_balance=to_decimal_2(net_bal),
        groups_count=len(memberships)
    )


@router.get("/activity/recent", response_model=List[schemas.UnifiedActivityItem])
def get_recent_activity(
    limit: int = Query(10, gt=0, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    activities = []

    # 1. Expenses
    splits = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.user_id == current_user.id
    ).all()
    for s in splits:
        exp = s.expense
        if exp:
            activities.append(
                schemas.UnifiedActivityItem(
                    id=f"exp_{exp.id}",
                    title=exp.title,
                    amount=to_decimal_2(Decimal(str(s.amount_owed))),
                    currency="INR",
                    date=exp.expense_date or date.today(),
                    activity_type="EXPENSE",
                    status=s.status,
                    reference_id=exp.id,
                    group_name=exp.group.name if exp.group else None
                )
            )

    # 2. Subscriptions
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).all()
    for sub in subs:
        activities.append(
            schemas.UnifiedActivityItem(
                id=f"sub_{sub.id}",
                title=sub.name,
                amount=to_decimal_2(Decimal(str(sub.amount))),
                currency=sub.currency or "INR",
                date=sub.next_renewal_date or date.today(),
                activity_type="SUBSCRIPTION",
                status=sub.status,
                reference_id=sub.id,
                group_name=None
            )
        )

    # 3. Settlements
    settlements = db.query(models.Settlement).filter(
        (models.Settlement.payer_id == current_user.id) | (models.Settlement.payee_id == current_user.id)
    ).all()
    for st in settlements:
        is_payer = st.payer_id == current_user.id
        title = f"Settled to {st.payee.name}" if is_payer else f"Received from {st.payer.name}"
        activities.append(
            schemas.UnifiedActivityItem(
                id=f"stl_{st.id}",
                title=title,
                amount=to_decimal_2(Decimal(str(st.amount))),
                currency="INR",
                date=st.settlement_date or date.today(),
                activity_type="SETTLEMENT",
                status="COMPLETED",
                reference_id=st.id,
                group_name=st.group.name if st.group else None
            )
        )

    activities.sort(key=lambda x: x.date, reverse=True)
    return activities[:limit]

