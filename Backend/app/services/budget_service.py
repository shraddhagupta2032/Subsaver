from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import extract

from app import models, schemas

TWO_PLACES = Decimal("0.01")


def to_decimal_2(val) -> Decimal:
    if not isinstance(val, Decimal):
        val = Decimal(str(val))
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_monthly_subscription_cost(sub: models.Subscription) -> Decimal:
    cycle = sub.billing_cycle.upper()
    amount = Decimal(str(sub.amount))
    if cycle == "MONTHLY":
        return amount
    elif cycle == "YEARLY":
        return (amount / Decimal("12")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    elif cycle == "WEEKLY":
        return (amount * Decimal("52") / Decimal("12")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    else:
        return amount


def calculate_category_spending(
    db: Session,
    user_id: int,
    category: str,
    target_month: Optional[int] = None,
    target_year: Optional[int] = None
) -> Tuple[Decimal, Decimal, Decimal]:
    today = date.today()
    check_month = target_month if target_month is not None else today.month
    check_year = target_year if target_year is not None else today.year

    is_overall = category.strip().upper() in ("ALL", "OVERALL", "TOTAL", "GENERAL")

    # 1. Subscription Spending
    sub_query = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.status == "ACTIVE"
    )
    if not is_overall:
        sub_query = sub_query.filter(models.Subscription.category.ilike(category.strip()))

    active_subs = sub_query.all()
    sub_spending = sum(
        (calculate_monthly_subscription_cost(s) for s in active_subs),
        start=Decimal("0.00")
    )

    # 2. Expense Spending
    splits = db.query(models.ExpenseSplit).join(models.Expense).filter(
        models.ExpenseSplit.user_id == user_id
    ).all()

    matching_splits = []
    for sp in splits:
        exp = sp.expense
        if not exp or not exp.expense_date:
            continue
        if exp.expense_date.year == check_year and exp.expense_date.month == check_month:
            if is_overall:
                matching_splits.append(sp)
            else:
                # Match category keyword in expense title or notes
                title_lower = (exp.title or "").lower()
                notes_lower = (exp.notes or "").lower()
                cat_lower = category.strip().lower()
                if cat_lower in title_lower or cat_lower in notes_lower:
                    matching_splits.append(sp)

    exp_spending = sum(
        (Decimal(str(sp.amount_owed)) for sp in matching_splits),
        start=Decimal("0.00")
    )

    total_spending = to_decimal_2(sub_spending + exp_spending)
    return to_decimal_2(sub_spending), to_decimal_2(exp_spending), total_spending


def compute_budget_status(budget: models.Budget, db: Session) -> schemas.BudgetStatusResponse:
    sub_spent, exp_spent, total_spent = calculate_category_spending(
        db=db,
        user_id=budget.user_id,
        category=budget.category,
        target_month=budget.month,
        target_year=budget.year
    )

    limit = to_decimal_2(Decimal(str(budget.monthly_limit)))
    remaining = max(Decimal("0.00"), limit - total_spent)

    if limit > Decimal("0.00"):
        percentage = ((total_spent / limit) * Decimal("100.00")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    else:
        percentage = Decimal("0.00")

    if total_spent > limit:
        status_str = "EXCEEDED"
    elif percentage >= Decimal(str(budget.alert_threshold_percentage)):
        status_str = "WARNING"
    else:
        status_str = "NORMAL"

    return schemas.BudgetStatusResponse(
        id=budget.id,
        user_id=budget.user_id,
        category=budget.category,
        monthly_limit=limit,
        spent_amount=total_spent,
        remaining_amount=to_decimal_2(remaining),
        percentage_utilized=percentage,
        alert_threshold_percentage=budget.alert_threshold_percentage,
        status=status_str,
        subscription_spending=sub_spent,
        expense_spending=exp_spent,
        month=budget.month,
        year=budget.year
    )


def get_user_budget_overview(db: Session, user_id: int) -> schemas.BudgetOverviewResponse:
    user_budgets = db.query(models.Budget).filter(models.Budget.user_id == user_id).all()

    statuses: List[schemas.BudgetStatusResponse] = [
        compute_budget_status(b, db) for b in user_budgets
    ]

    total_budget = sum((s.monthly_limit for s in statuses), start=Decimal("0.00"))
    total_spent = sum((s.spent_amount for s in statuses), start=Decimal("0.00"))
    total_remaining = max(Decimal("0.00"), total_budget - total_spent)

    if total_budget > Decimal("0.00"):
        overall_pct = ((total_spent / total_budget) * Decimal("100.00")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    else:
        overall_pct = Decimal("0.00")

    warning_count = sum(1 for s in statuses if s.status == "WARNING")
    exceeded_count = sum(1 for s in statuses if s.status == "EXCEEDED")

    return schemas.BudgetOverviewResponse(
        total_budget=to_decimal_2(total_budget),
        total_spent=to_decimal_2(total_spent),
        total_remaining=to_decimal_2(total_remaining),
        overall_percentage=overall_pct,
        budgets_count=len(statuses),
        warning_count=warning_count,
        exceeded_count=exceeded_count,
        budgets=statuses
    )
