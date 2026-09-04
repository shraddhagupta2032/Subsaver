from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class AddGroupMember(BaseModel):
    email: Optional[EmailStr] = None
    user_id: Optional[int] = None


class GroupMemberResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: EmailStr
    joined_at: datetime

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: datetime
    members_count: int = 0

    class Config:
        from_attributes = True


class GroupDetailResponse(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: datetime
    members: List[GroupMemberResponse] = []

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    group_id: int
    title: str = Field(..., min_length=1, max_length=200)
    total_amount: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2)
    payer_id: int
    expense_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    split_user_ids: List[int] = Field(..., min_length=1)


class ExpenseSplitResponse(BaseModel):
    id: int
    expense_id: int
    user_id: int
    user_name: str
    user_email: EmailStr
    amount_owed: Decimal
    amount_paid: Decimal
    status: str
    promised_payment_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseResponse(BaseModel):
    id: int
    group_id: int
    group_name: str
    created_by: int
    creator_name: str
    title: str
    total_amount: Decimal
    payer_id: int
    payer_name: str
    expense_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    splits: List[ExpenseSplitResponse] = []

    class Config:
        from_attributes = True


class PayLaterRequest(BaseModel):
    promised_payment_date: date


VALID_BILLING_CYCLES = {"MONTHLY", "YEARLY", "WEEKLY", "CUSTOM"}
VALID_SUBSCRIPTION_STATUSES = {"ACTIVE", "PAUSED", "CANCELLED"}


class SubscriptionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2)
    currency: str = Field(default="INR", min_length=1, max_length=10)
    billing_cycle: str
    next_renewal_date: date
    category: Optional[str] = Field(default=None, max_length=50)
    status: str = Field(default="ACTIVE")
    trial_end_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Subscription name cannot be empty")
        return v.strip()

    @field_validator("billing_cycle")
    def validate_billing_cycle(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in VALID_BILLING_CYCLES:
            raise ValueError(f"billing_cycle must be one of: {', '.join(sorted(VALID_BILLING_CYCLES))}")
        return upper_v

    @field_validator("status")
    def validate_status(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in VALID_SUBSCRIPTION_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(VALID_SUBSCRIPTION_STATUSES))}")
        return upper_v


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    amount: Optional[Decimal] = Field(default=None, gt=Decimal("0.00"), decimal_places=2)
    currency: Optional[str] = Field(default=None, min_length=1, max_length=10)
    billing_cycle: Optional[str] = None
    next_renewal_date: Optional[date] = None
    category: Optional[str] = Field(default=None, max_length=50)
    status: Optional[str] = None
    trial_end_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("name")
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError("Subscription name cannot be empty")
            return v.strip()
        return v

    @field_validator("billing_cycle")
    def validate_billing_cycle(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            upper_v = v.strip().upper()
            if upper_v not in VALID_BILLING_CYCLES:
                raise ValueError(f"billing_cycle must be one of: {', '.join(sorted(VALID_BILLING_CYCLES))}")
            return upper_v
        return v

    @field_validator("status")
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            upper_v = v.strip().upper()
            if upper_v not in VALID_SUBSCRIPTION_STATUSES:
                raise ValueError(f"status must be one of: {', '.join(sorted(VALID_SUBSCRIPTION_STATUSES))}")
            return upper_v
        return v


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    name: str
    amount: Decimal
    currency: str
    billing_cycle: str
    next_renewal_date: date
    category: Optional[str] = None
    status: str
    trial_end_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    reminder_type: str
    title: str
    message: str
    reminder_date: datetime
    status: str
    subscription_id: Optional[int] = None
    expense_split_id: Optional[int] = None
    notification_sent: bool = False
    notification_sent_at: Optional[datetime] = None
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationSettingsResponse(BaseModel):
    user_id: int
    subscription_reminders_enabled: bool
    expense_reminders_enabled: bool
    reminder_days_before: int

    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    subscription_reminders_enabled: Optional[bool] = None
    expense_reminders_enabled: Optional[bool] = None
    reminder_days_before: Optional[int] = Field(default=None, ge=0, le=30)



class FinancialSummaryResponse(BaseModel):
    total_subscription_monthly: Decimal
    total_subscription_yearly: Decimal
    total_subscription_active: int
    total_subscription_paused: int
    total_subscription_cancelled: int
    total_expense_owed: Decimal
    total_expense_paid: Decimal
    total_expense_pending: Decimal
    total_expense_pay_later: Decimal
    upcoming_subscription_renewals: int
    upcoming_expense_payments: int

    class Config:
        from_attributes = True


class SubscriptionCategorySummary(BaseModel):
    category: Optional[str] = None
    subscription_count: int
    monthly_amount: Decimal
    yearly_amount: Decimal

    class Config:
        from_attributes = True


class GroupExpenseSummary(BaseModel):
    group_id: int
    group_name: str
    total_expense: Decimal
    total_paid: Decimal
    current_user_pending_amount: Decimal

    class Config:
        from_attributes = True


class UpcomingPaymentResponse(BaseModel):
    expense_id: int
    expense_title: str
    group_id: int
    group_name: str
    amount_owed: Decimal
    amount_paid: Decimal
    remaining_amount: Decimal
    status: str
    due_date: Optional[date] = None
    promised_payment_date: Optional[date] = None

    class Config:
        from_attributes = True


class UpcomingRenewalResponse(BaseModel):
    subscription_id: int
    name: str
    amount: Decimal
    currency: str
    billing_cycle: str
    next_renewal_date: date
    category: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class MonthlyTrendItem(BaseModel):
    month_name: str
    month: int
    year: int
    spending: Decimal

    class Config:
        from_attributes = True


class MonthlySpendingResponse(BaseModel):
    current_month_spending: Decimal
    previous_month_spending: Decimal
    percentage_change: Optional[float] = None
    is_increase: Optional[bool] = None
    current_month_name: str
    previous_month_name: str
    trends: List[MonthlyTrendItem] = []

    class Config:
        from_attributes = True


class CategorySpendingItem(BaseModel):
    category: str
    amount: Decimal
    percentage: float
    expense_count: int

    class Config:
        from_attributes = True


class CategorySpendingResponse(BaseModel):
    total_spending: Decimal
    categories: List[CategorySpendingItem] = []

    class Config:
        from_attributes = True


class TotalGroupBalancesSummary(BaseModel):
    total_owed: Decimal
    total_receivable: Decimal
    net_balance: Decimal
    groups_count: int

    class Config:
        from_attributes = True


class UnifiedActivityItem(BaseModel):
    id: str
    title: str
    amount: Decimal
    currency: str = "INR"
    date: date
    activity_type: str
    status: Optional[str] = None
    reference_id: Optional[int] = None
    group_name: Optional[str] = None

    class Config:
        from_attributes = True



VALID_PAYMENT_METHODS = {"UPI", "CASH", "BANK_TRANSFER", "OTHER"}


class SettlementCreate(BaseModel):
    payee_id: int
    amount: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2)
    payment_method: str = Field(default="UPI")
    settlement_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("payment_method")
    def validate_payment_method(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in VALID_PAYMENT_METHODS:
            raise ValueError(f"payment_method must be one of: {', '.join(sorted(VALID_PAYMENT_METHODS))}")
        return upper_v


class SettlementResponse(BaseModel):
    id: int
    group_id: int
    group_name: str
    payer_id: int
    payer_name: str
    payee_id: int
    payee_name: str
    amount: Decimal
    settlement_date: date
    payment_method: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MemberBalance(BaseModel):
    user_id: int
    user_name: str
    user_email: str
    total_paid_for_group: Decimal
    total_share_owed: Decimal
    net_settlements: Decimal
    net_balance: Decimal
    status: str  # OWES_MONEY, GETS_BACK, SETTLED

    class Config:
        from_attributes = True


class DebtTransfer(BaseModel):
    from_user_id: int
    from_user_name: str
    to_user_id: int
    to_user_name: str
    amount: Decimal

    class Config:
        from_attributes = True


class UserDebtItem(BaseModel):
    id: str
    group_id: int
    group_name: str
    from_user_id: int
    from_user_name: str
    to_user_id: int
    to_user_name: str
    amount: Decimal
    direction: str  # "YOU_OWE" | "OWED_TO_YOU"
    other_user_id: int
    other_user_name: str

    class Config:
        from_attributes = True


class GroupBalanceResponse(BaseModel):
    group_id: int
    group_name: str
    total_group_spending: Decimal
    total_settlements_completed: Decimal
    member_balances: List[MemberBalance]
    suggested_settlements: List[DebtTransfer]

    class Config:
        from_attributes = True


class BudgetCreate(BaseModel):
    category: str
    monthly_limit: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2)
    alert_threshold_percentage: int = Field(default=80, ge=1, le=100)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    year: Optional[int] = Field(default=None, ge=2000, le=2100)

    @field_validator("category")
    def validate_category(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("category cannot be empty")
        return trimmed


class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    monthly_limit: Optional[Decimal] = Field(default=None, gt=Decimal("0.00"), decimal_places=2)
    alert_threshold_percentage: Optional[int] = Field(default=None, ge=1, le=100)

    @field_validator("category")
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("category cannot be empty")
            return trimmed
        return v



class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category: str
    monthly_limit: Decimal
    alert_threshold_percentage: int
    month: Optional[int] = None
    year: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetStatusResponse(BaseModel):
    id: int
    user_id: int
    category: str
    monthly_limit: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_utilized: Decimal
    alert_threshold_percentage: int
    status: str  # NORMAL, WARNING, EXCEEDED
    subscription_spending: Decimal
    expense_spending: Decimal
    month: Optional[int] = None
    year: Optional[int] = None

    class Config:
        from_attributes = True


class BudgetOverviewResponse(BaseModel):
    total_budget: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    overall_percentage: Decimal
    budgets_count: int
    warning_count: int
    exceeded_count: int
    budgets: List[BudgetStatusResponse]

    class Config:
        from_attributes = True


VALID_SHARED_SUB_CYCLES = {"MONTHLY", "YEARLY", "WEEKLY", "CUSTOM"}
VALID_SHARED_SUB_STATUSES = {"ACTIVE", "PAUSED", "CANCELLED"}


class SharedSubscriptionMemberResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    share_amount: Decimal

    class Config:
        from_attributes = True


class SharedSubscriptionCreate(BaseModel):
    name: str
    total_amount: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2)
    currency: str = Field(default="INR")
    billing_cycle: str = Field(default="MONTHLY")
    next_renewal_date: date
    payer_id: int
    category: Optional[str] = "Entertainment"
    member_user_ids: List[int]
    auto_renew_expense: bool = True
    notes: Optional[str] = None

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Subscription name cannot be empty")
        return trimmed

    @field_validator("billing_cycle")
    def validate_billing_cycle(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in VALID_SHARED_SUB_CYCLES:
            raise ValueError(f"billing_cycle must be one of: {', '.join(sorted(VALID_SHARED_SUB_CYCLES))}")
        return upper_v

    @field_validator("member_user_ids")
    def validate_member_user_ids(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("member_user_ids cannot be empty")
        return v


class SharedSubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    total_amount: Optional[Decimal] = Field(default=None, gt=Decimal("0.00"), decimal_places=2)
    currency: Optional[str] = None
    payer_id: Optional[int] = None
    billing_cycle: Optional[str] = None
    next_renewal_date: Optional[date] = None
    category: Optional[str] = None
    status: Optional[str] = None
    member_user_ids: Optional[List[int]] = None
    auto_renew_expense: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("name")
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Subscription name cannot be empty")
            return trimmed
        return v

    @field_validator("billing_cycle")
    def validate_billing_cycle(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            upper_v = v.strip().upper()
            if upper_v not in VALID_SHARED_SUB_CYCLES:
                raise ValueError(f"billing_cycle must be one of: {', '.join(sorted(VALID_SHARED_SUB_CYCLES))}")
            return upper_v
        return v

    @field_validator("status")
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            upper_v = v.strip().upper()
            if upper_v not in VALID_SHARED_SUB_STATUSES:
                raise ValueError(f"status must be one of: {', '.join(sorted(VALID_SHARED_SUB_STATUSES))}")
            return upper_v
        return v

    @field_validator("member_user_ids")
    def validate_member_user_ids(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None and len(v) == 0:
            raise ValueError("member_user_ids cannot be empty")
        return v


class SharedSubscriptionResponse(BaseModel):
    id: int
    group_id: int
    group_name: str
    created_by: int
    creator_name: str
    payer_id: int
    payer_name: str
    name: str
    total_amount: Decimal
    currency: str
    billing_cycle: str
    next_renewal_date: date
    category: Optional[str] = None
    status: str
    auto_renew_expense: bool
    notes: Optional[str] = None
    members: List[SharedSubscriptionMemberResponse]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SharedSubscriptionRenewalResult(BaseModel):
    shared_subscription_id: int
    generated_expense_id: int
    expense_title: str
    total_amount: Decimal
    splits_created: int
    next_renewal_date: date

    class Config:
        from_attributes = True


VALID_DOCUMENT_TYPES = {"EXPENSE", "SUBSCRIPTION", "UNKNOWN"}
VALID_SCAN_CONFIRM_TYPES = {"EXPENSE", "SUBSCRIPTION", "SHARED_SUBSCRIPTION"}
VALID_SCAN_STATUSES = {"SUCCESS", "PARTIAL", "FAILED"}


class BillScanExtractedData(BaseModel):
    merchant_name: Optional[str] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = "INR"
    bill_date: Optional[date] = None
    due_date: Optional[date] = None
    category: Optional[str] = None
    description: Optional[str] = None
    billing_cycle: Optional[str] = None
    next_renewal_date: Optional[date] = None
    document_type: str = "UNKNOWN"
    confidence: Decimal = Field(default=Decimal("0.80"), ge=Decimal("0.0"), le=Decimal("1.0"))

    @field_validator("document_type")
    def validate_document_type(cls, v: str) -> str:
        upper_v = (v or "").strip().upper()
        if upper_v not in VALID_DOCUMENT_TYPES:
            return "UNKNOWN"
        return upper_v

    @field_validator("billing_cycle")
    def validate_billing_cycle(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            upper_v = v.strip().upper()
            if upper_v not in VALID_SHARED_SUB_CYCLES:
                return None
            return upper_v
        return v

    @field_validator("total_amount")
    def validate_total_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= Decimal("0.00"):
            raise ValueError("total_amount must be greater than 0.00")
        return v


class BillScanResponse(BaseModel):
    scan_id: str
    status: str  # SUCCESS, PARTIAL, FAILED
    extracted_data: Optional[BillScanExtractedData] = None
    warnings: List[str] = []

    class Config:
        from_attributes = True


class BillScanConfirmRequest(BaseModel):
    creation_type: str  # EXPENSE, SUBSCRIPTION, SHARED_SUBSCRIPTION
    expense_data: Optional[ExpenseCreate] = None
    subscription_data: Optional[SubscriptionCreate] = None
    shared_subscription_data: Optional[SharedSubscriptionCreate] = None
    group_id: Optional[int] = None

    @field_validator("creation_type")
    def validate_creation_type(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in VALID_SCAN_CONFIRM_TYPES:
            raise ValueError(f"creation_type must be one of: {', '.join(sorted(VALID_SCAN_CONFIRM_TYPES))}")
        return upper_v


class BillScanConfirmResponse(BaseModel):
    creation_type: str
    created_record_id: int
    message: str
    expense: Optional[ExpenseResponse] = None
    subscription: Optional[SubscriptionResponse] = None
    shared_subscription: Optional[SharedSubscriptionResponse] = None

    class Config:
        from_attributes = True


# =========================================================
# PHASE 12: SUBSCRIPTION INTELLIGENCE & OPTIMIZATION SCHEMAS
# =========================================================

class SubscriptionIntelligenceSummary(BaseModel):
    monthly_subscription_cost: Decimal
    annualized_subscription_cost: Optional[Decimal] = None
    active_subscription_count: int
    personal_subscription_count: int
    shared_subscription_count: int
    highest_category: Optional[str] = None
    highest_category_amount: Optional[Decimal] = None

    class Config:
        from_attributes = True


class CategorySubscriptionAnalysis(BaseModel):
    category: str
    monthly_cost: Decimal
    annualized_cost: Optional[Decimal] = None
    subscription_count: int
    percentage_of_total: Decimal

    class Config:
        from_attributes = True


class TopSubscriptionItem(BaseModel):
    id: int
    name: str
    subscription_type: str  # "PERSONAL" or "SHARED"
    category: Optional[str] = None
    billing_cycle: str
    user_cost: Decimal
    monthly_equivalent: Decimal
    annualized_equivalent: Optional[Decimal] = None
    next_renewal_date: date

    class Config:
        from_attributes = True


class RenewalIntelligenceItem(BaseModel):
    id: int
    name: str
    subscription_type: str  # "PERSONAL" or "SHARED"
    category: Optional[str] = None
    billing_cycle: str
    user_cost: Decimal
    next_renewal_date: date
    days_until_renewal: int

    class Config:
        from_attributes = True


class CategoryConcentrationItem(BaseModel):
    category: str
    subscription_count: int
    severity: str  # "LOW", "MEDIUM", "HIGH"
    message: str
    subscription_names: List[str]

    class Config:
        from_attributes = True


class BudgetSubscriptionImpactItem(BaseModel):
    category: str
    budget_limit: Decimal
    subscription_monthly_cost: Decimal
    percentage_used: Decimal
    status: str  # "WITHIN_LIMIT", "NEAR_LIMIT", "OVER_LIMIT"

    class Config:
        from_attributes = True


class SubscriptionInsightItem(BaseModel):
    type: str
    severity: str  # "INFO", "LOW", "MEDIUM", "HIGH"
    title: str
    message: str
    potential_saving: Optional[Decimal] = None

    class Config:
        from_attributes = True


class SubscriptionHealthResponse(BaseModel):
    health_score: int
    factors: List[str]
    active_subscriptions: int
    monthly_cost: Decimal
    annualized_cost: Optional[Decimal] = None
    renewals_next_7_days: int
    categories_over_budget: int
    high_concentration_categories: int
    insights_count: int

    class Config:
        from_attributes = True










        