from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app import models, schemas

TWO_PLACES = Decimal("0.01")


def to_decimal_2(val) -> Decimal:
    if not isinstance(val, Decimal):
        val = Decimal(str(val))
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_monthly_equivalent(amount: Decimal, billing_cycle: str) -> Decimal:
    cycle = (billing_cycle or "").strip().upper()
    amount = to_decimal_2(amount)

    if cycle == "MONTHLY":
        return amount
    elif cycle == "YEARLY":
        return (amount / Decimal("12")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    elif cycle == "WEEKLY":
        return ((amount * Decimal("52")) / Decimal("12")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    elif cycle == "CUSTOM":
        return amount
    else:
        return amount


def calculate_annualized_cost(amount: Decimal, billing_cycle: str) -> Optional[Decimal]:
    cycle = (billing_cycle or "").strip().upper()
    amount = to_decimal_2(amount)

    if cycle == "MONTHLY":
        return (amount * Decimal("12")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    elif cycle == "YEARLY":
        return amount
    elif cycle == "WEEKLY":
        return (amount * Decimal("52")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    elif cycle == "CUSTOM":
        # Documented: Cannot fabricate annualized cost without exact recurrence duration
        return None
    else:
        return None


def get_user_active_subscriptions(db: Session, user_id: int) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    # 1. Personal active subscriptions
    personal_subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.status == "ACTIVE"
    ).all()

    for p in personal_subs:
        cost = to_decimal_2(Decimal(str(p.amount)))
        results.append({
            "id": p.id,
            "name": p.name,
            "type": "PERSONAL",
            "category": p.category or "Uncategorized",
            "billing_cycle": p.billing_cycle,
            "user_cost": cost,
            "monthly_cost": calculate_monthly_equivalent(cost, p.billing_cycle),
            "annual_cost": calculate_annualized_cost(cost, p.billing_cycle),
            "next_renewal_date": p.next_renewal_date
        })

    # 2. Phase 10 Shared active subscriptions where user is a participant
    shared_memberships = db.query(models.SharedSubscriptionMember).join(
        models.SharedSubscription,
        models.SharedSubscription.id == models.SharedSubscriptionMember.shared_subscription_id
    ).filter(
        models.SharedSubscriptionMember.user_id == user_id,
        models.SharedSubscription.status == "ACTIVE"
    ).all()

    for m in shared_memberships:
        sub = m.shared_subscription
        # Rule: ONLY count user's individual share_amount, NOT total_amount
        cost = to_decimal_2(Decimal(str(m.share_amount)))
        results.append({
            "id": sub.id,
            "name": sub.name,
            "type": "SHARED",
            "category": sub.category or "Uncategorized",
            "billing_cycle": sub.billing_cycle,
            "user_cost": cost,
            "monthly_cost": calculate_monthly_equivalent(cost, sub.billing_cycle),
            "annual_cost": calculate_annualized_cost(cost, sub.billing_cycle),
            "next_renewal_date": sub.next_renewal_date
        })

    return results


def get_subscription_summary(db: Session, user_id: int) -> schemas.SubscriptionIntelligenceSummary:
    subs = get_user_active_subscriptions(db, user_id)

    if not subs:
        return schemas.SubscriptionIntelligenceSummary(
            monthly_subscription_cost=Decimal("0.00"),
            annualized_subscription_cost=Decimal("0.00"),
            active_subscription_count=0,
            personal_subscription_count=0,
            shared_subscription_count=0,
            highest_category=None,
            highest_category_amount=None
        )

    monthly_total = sum((s["monthly_cost"] for s in subs), Decimal("0.00"))
    annual_known = [s["annual_cost"] for s in subs if s["annual_cost"] is not None]
    annual_total = sum(annual_known, Decimal("0.00")) if annual_known else None

    personal_count = sum(1 for s in subs if s["type"] == "PERSONAL")
    shared_count = sum(1 for s in subs if s["type"] == "SHARED")

    # Category breakdown for highest category
    cat_totals: Dict[str, Decimal] = {}
    for s in subs:
        cat = s["category"]
        cat_totals[cat] = cat_totals.get(cat, Decimal("0.00")) + s["monthly_cost"]

    highest_cat = None
    highest_amount = None
    if cat_totals:
        highest_cat = max(cat_totals.keys(), key=lambda k: cat_totals[k])
        highest_amount = cat_totals[highest_cat]

    return schemas.SubscriptionIntelligenceSummary(
        monthly_subscription_cost=to_decimal_2(monthly_total),
        annualized_subscription_cost=to_decimal_2(annual_total) if annual_total is not None else None,
        active_subscription_count=len(subs),
        personal_subscription_count=personal_count,
        shared_subscription_count=shared_count,
        highest_category=highest_cat,
        highest_category_amount=to_decimal_2(highest_amount) if highest_amount is not None else None
    )


def get_category_analysis(db: Session, user_id: int) -> List[schemas.CategorySubscriptionAnalysis]:
    subs = get_user_active_subscriptions(db, user_id)
    if not subs:
        return []

    total_monthly = sum((s["monthly_cost"] for s in subs), Decimal("0.00"))

    categories: Dict[str, List[Dict[str, Any]]] = {}
    for s in subs:
        cat = s["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(s)

    results: List[schemas.CategorySubscriptionAnalysis] = []
    for cat, items in categories.items():
        monthly_cost = sum((i["monthly_cost"] for i in items), Decimal("0.00"))
        annual_known = [i["annual_cost"] for i in items if i["annual_cost"] is not None]
        annual_cost = sum(annual_known, Decimal("0.00")) if annual_known else None

        pct = Decimal("0.00")
        if total_monthly > Decimal("0.00"):
            pct = ((monthly_cost / total_monthly) * Decimal("100")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        results.append(schemas.CategorySubscriptionAnalysis(
            category=cat,
            monthly_cost=to_decimal_2(monthly_cost),
            annualized_cost=to_decimal_2(annual_cost) if annual_cost is not None else None,
            subscription_count=len(items),
            percentage_of_total=pct
        ))

    results.sort(key=lambda x: x.monthly_cost, reverse=True)
    return results


def get_top_subscriptions(db: Session, user_id: int, limit: int = 5) -> List[schemas.TopSubscriptionItem]:
    if not isinstance(limit, int):
        limit = getattr(limit, "default", 5)
        if not isinstance(limit, int):
            limit = 5

    subs = get_user_active_subscriptions(db, user_id)
    subs.sort(key=lambda s: s["monthly_cost"], reverse=True)

    top_items = subs[:max(1, limit)]
    return [
        schemas.TopSubscriptionItem(
            id=s["id"],
            name=s["name"],
            subscription_type=s["type"],
            category=s["category"],
            billing_cycle=s["billing_cycle"],
            user_cost=s["user_cost"],
            monthly_equivalent=s["monthly_cost"],
            annualized_equivalent=s["annual_cost"],
            next_renewal_date=s["next_renewal_date"]
        )
        for s in top_items
    ]


def get_upcoming_renewals(
    db: Session,
    user_id: int,
    days: int = 7
) -> List[schemas.RenewalIntelligenceItem]:
    if not isinstance(days, int):
        days = getattr(days, "default", 7)
        if not isinstance(days, int):
            days = 7

    subs = get_user_active_subscriptions(db, user_id)
    today = date.today()
    target_date = today + timedelta(days=max(0, days))


    renewing_items = []
    for s in subs:
        ren_date = s["next_renewal_date"]
        if ren_date and today <= ren_date <= target_date:
            days_until = (ren_date - today).days
            renewing_items.append(
                schemas.RenewalIntelligenceItem(
                    id=s["id"],
                    name=s["name"],
                    subscription_type=s["type"],
                    category=s["category"],
                    billing_cycle=s["billing_cycle"],
                    user_cost=s["user_cost"],
                    next_renewal_date=ren_date,
                    days_until_renewal=days_until
                )
            )

    renewing_items.sort(key=lambda x: x.next_renewal_date)
    return renewing_items


def detect_category_concentration(db: Session, user_id: int) -> List[schemas.CategoryConcentrationItem]:
    subs = get_user_active_subscriptions(db, user_id)
    if not subs:
        return []

    cat_map: Dict[str, List[str]] = {}
    for s in subs:
        cat = s["category"]
        if cat not in cat_map:
            cat_map[cat] = []
        cat_map[cat].append(s["name"])

    items: List[schemas.CategoryConcentrationItem] = []
    for cat, names in cat_map.items():
        count = len(names)
        if count <= 1:
            continue

        if count == 2:
            severity = "LOW"
            msg = f"You have 2 active subscriptions in {cat}."
        elif count == 3:
            severity = "MEDIUM"
            msg = f"You have 3 active subscriptions in {cat}. Review whether all are necessary."
        else:
            severity = "HIGH"
            msg = f"High concentration: You have {count} active subscriptions in {cat}."

        items.append(schemas.CategoryConcentrationItem(
            category=cat,
            subscription_count=count,
            severity=severity,
            message=msg,
            subscription_names=names
        ))

    items.sort(key=lambda x: x.subscription_count, reverse=True)
    return items


def calculate_budget_impact(db: Session, user_id: int) -> List[schemas.BudgetSubscriptionImpactItem]:
    budgets = db.query(models.Budget).filter(models.Budget.user_id == user_id).all()
    if not budgets:
        return []

    subs = get_user_active_subscriptions(db, user_id)
    total_monthly = sum((s["monthly_cost"] for s in subs), Decimal("0.00"))

    cat_monthly: Dict[str, Decimal] = {}
    for s in subs:
        cat = s["category"].strip().upper()
        cat_monthly[cat] = cat_monthly.get(cat, Decimal("0.00")) + s["monthly_cost"]

    impact_items: List[schemas.BudgetSubscriptionImpactItem] = []
    for b in budgets:
        b_cat = b.category.strip().upper()
        if b_cat == "OVERALL":
            sub_spent = total_monthly
        else:
            sub_spent = cat_monthly.get(b_cat, Decimal("0.00"))

        limit = to_decimal_2(Decimal(str(b.monthly_limit)))
        pct = Decimal("0.00")
        if limit > Decimal("0.00"):
            pct = ((sub_spent / limit) * Decimal("100")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        if pct > Decimal("100.00"):
            status_val = "OVER_LIMIT"
        elif pct >= Decimal("80.00"):
            status_val = "NEAR_LIMIT"
        else:
            status_val = "WITHIN_LIMIT"

        impact_items.append(schemas.BudgetSubscriptionImpactItem(
            category=b.category,
            budget_limit=limit,
            subscription_monthly_cost=to_decimal_2(sub_spent),
            percentage_used=pct,
            status=status_val
        ))

    impact_items.sort(key=lambda x: x.percentage_used, reverse=True)
    return impact_items


def generate_subscription_insights(db: Session, user_id: int) -> List[schemas.SubscriptionInsightItem]:
    subs = get_user_active_subscriptions(db, user_id)
    insights: List[schemas.SubscriptionInsightItem] = []

    if not subs:
        insights.append(schemas.SubscriptionInsightItem(
            type="INFO",
            severity="INFO",
            title="No Active Subscriptions",
            message="You currently have no active personal or shared subscriptions being tracked."
        ))
        return insights

    total_monthly = sum((s["monthly_cost"] for s in subs), Decimal("0.00"))
    annual_known = [s["annual_cost"] for s in subs if s["annual_cost"] is not None]
    annual_total = sum(annual_known, Decimal("0.00")) if annual_known else None

    # 1. Annual Impact
    if annual_total is not None and annual_total > Decimal("0.00"):
        insights.append(schemas.SubscriptionInsightItem(
            type="ANNUAL_IMPACT",
            severity="INFO",
            title="Annual Subscription Burden",
            message=f"Your recurring subscriptions total approximately INR {annual_total:,.2f} per year."
        ))

    # 2. Category Concentration
    concentrations = detect_category_concentration(db, user_id)
    for conc in concentrations:
        insights.append(schemas.SubscriptionInsightItem(
            type="CATEGORY_CONCENTRATION",
            severity=conc.severity,
            title=f"Subscription Concentration in {conc.category}",
            message=conc.message
        ))

    # 3. Budget Pressure
    budget_impacts = calculate_budget_impact(db, user_id)
    for bi in budget_impacts:
        if bi.status == "OVER_LIMIT":
            insights.append(schemas.SubscriptionInsightItem(
                type="BUDGET_PRESSURE",
                severity="HIGH",
                title=f"{bi.category} Budget Exceeded",
                message=f"Subscriptions in {bi.category} (INR {bi.subscription_monthly_cost}) exceed your monthly budget limit of INR {bi.budget_limit} ({bi.percentage_used}% used)."
            ))
        elif bi.status == "NEAR_LIMIT":
            insights.append(schemas.SubscriptionInsightItem(
                type="BUDGET_PRESSURE",
                severity="MEDIUM",
                title=f"{bi.category} Budget Near Limit",
                message=f"Subscriptions in {bi.category} consume {bi.percentage_used}% of your monthly budget limit of INR {bi.budget_limit}."
            ))

    # 4. Upcoming Renewals (Next 7 days)
    upcoming_7 = get_upcoming_renewals(db, user_id, days=7)
    if upcoming_7:
        insights.append(schemas.SubscriptionInsightItem(
            type="UPCOMING_RENEWALS",
            severity="LOW" if len(upcoming_7) <= 2 else "MEDIUM",
            title="Upcoming Renewals This Week",
            message=f"{len(upcoming_7)} subscription(s) will renew within the next 7 days."
        ))

    # 5. High Category Spending (> 40% of total)
    cat_analysis = get_category_analysis(db, user_id)
    for cat_item in cat_analysis:
        if cat_item.percentage_of_total >= Decimal("40.00") and len(cat_analysis) > 1:
            insights.append(schemas.SubscriptionInsightItem(
                type="HIGH_CATEGORY_SPENDING",
                severity="MEDIUM",
                title=f"High {cat_item.category} Spending",
                message=f"{cat_item.category} accounts for {cat_item.percentage_of_total}% (INR {cat_item.monthly_cost}/month) of your total subscription spending."
            ))

    return insights


def calculate_subscription_health(db: Session, user_id: int) -> schemas.SubscriptionHealthResponse:
    subs = get_user_active_subscriptions(db, user_id)
    total_monthly = sum((s["monthly_cost"] for s in subs), Decimal("0.00"))
    annual_known = [s["annual_cost"] for s in subs if s["annual_cost"] is not None]
    annual_total = sum(annual_known, Decimal("0.00")) if annual_known else None

    score = 100
    factors: List[str] = []

    budget_impacts = calculate_budget_impact(db, user_id)
    over_budget_count = sum(1 for bi in budget_impacts if bi.status == "OVER_LIMIT")
    near_budget_count = sum(1 for bi in budget_impacts if bi.status == "NEAR_LIMIT")

    for bi in budget_impacts:
        if bi.status == "OVER_LIMIT":
            score -= 10
            factors.append(f"'{bi.category}' subscriptions exceed category budget ({bi.percentage_used}%)")
        elif bi.status == "NEAR_LIMIT":
            score -= 5
            factors.append(f"'{bi.category}' subscriptions consume over 80% of category budget ({bi.percentage_used}%)")

    concentrations = detect_category_concentration(db, user_id)
    high_conc_count = sum(1 for c in concentrations if c.severity == "HIGH")
    for c in concentrations:
        if c.severity == "HIGH":
            score -= 5
            factors.append(f"High subscription concentration in '{c.category}' ({c.subscription_count} subscriptions)")

    renewing_7 = get_upcoming_renewals(db, user_id, days=7)
    if len(renewing_7) >= 3:
        score -= 5
        factors.append(f"{len(renewing_7)} subscriptions renew within the next 7 days")

    # Clamp score
    final_score = max(0, min(100, score))
    if not factors:
        factors.append("Healthy subscription profile with balanced spending and active budget coverage.")

    insights = generate_subscription_insights(db, user_id)

    return schemas.SubscriptionHealthResponse(
        health_score=final_score,
        factors=factors,
        active_subscriptions=len(subs),
        monthly_cost=to_decimal_2(total_monthly),
        annualized_cost=to_decimal_2(annual_total) if annual_total is not None else None,
        renewals_next_7_days=len(renewing_7),
        categories_over_budget=over_budget_count,
        high_concentration_categories=high_conc_count,
        insights_count=len(insights)
    )
