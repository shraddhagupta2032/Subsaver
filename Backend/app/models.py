from sqlalchemy import Column, Integer, String, DateTime, Date, Numeric, Text, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group_memberships = relationship("GroupMember", back_populates="user")
    expense_splits = relationship("ExpenseSplit", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    notification_settings = relationship("NotificationSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settlements_paid = relationship("Settlement", foreign_keys="Settlement.payer_id", back_populates="payer")
    settlements_received = relationship("Settlement", foreign_keys="Settlement.payee_id", back_populates="payee")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    shared_subscriptions_created = relationship("SharedSubscription", foreign_keys="SharedSubscription.created_by", back_populates="creator")
    shared_subscriptions_paying = relationship("SharedSubscription", foreign_keys="SharedSubscription.payer_id", back_populates="payer")
    shared_subscription_memberships = relationship("SharedSubscriptionMember", back_populates="user", cascade="all, delete-orphan")




class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="group", cascade="all, delete-orphan")
    settlements = relationship("Settlement", back_populates="group", cascade="all, delete-orphan")
    shared_subscriptions = relationship("SharedSubscription", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_user"),)

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expense_date = Column(Date, nullable=False, default=func.current_date())
    due_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="expenses")
    creator = relationship("User", foreign_keys=[created_by])
    payer = relationship("User", foreign_keys=[payer_id])
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount_owed = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False, default=0.00)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, PAID, PAY_LATER, OVERDUE
    promised_payment_date = Column(Date, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="expense_splits")
    reminders = relationship("Reminder", back_populates="expense_split", cascade="all, delete-orphan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    billing_cycle = Column(String(20), nullable=False)  # MONTHLY, YEARLY, WEEKLY, CUSTOM
    next_renewal_date = Column(Date, nullable=False)
    category = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE")  # ACTIVE, PAUSED, CANCELLED
    trial_end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="subscriptions")
    reminders = relationship("Reminder", back_populates="subscription", cascade="all, delete-orphan")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reminder_type = Column(String(30), nullable=False)  # SUBSCRIPTION_RENEWAL, EXPENSE_PAYMENT
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    reminder_date = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, READ
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    expense_split_id = Column(Integer, ForeignKey("expense_splits.id"), nullable=True)
    notification_sent = Column(Boolean, nullable=False, default=False)
    notification_sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="reminders")
    subscription = relationship("Subscription", back_populates="reminders")
    expense_split = relationship("ExpenseSplit", back_populates="reminders")


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    subscription_reminders_enabled = Column(Boolean, nullable=False, default=True)
    expense_reminders_enabled = Column(Boolean, nullable=False, default=True)
    reminder_days_before = Column(Integer, nullable=False, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notification_settings")


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    payee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    settlement_date = Column(Date, nullable=False, default=func.current_date())
    payment_method = Column(String(50), nullable=False, default="UPI")  # UPI, CASH, BANK_TRANSFER, OTHER
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="settlements")
    payer = relationship("User", foreign_keys=[payer_id], back_populates="settlements_paid")
    payee = relationship("User", foreign_keys=[payee_id], back_populates="settlements_received")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    monthly_limit = Column(Numeric(10, 2), nullable=False)
    alert_threshold_percentage = Column(Integer, nullable=False, default=80)
    month = Column(Integer, nullable=True)  # 1-12 or None for permanent monthly budget
    year = Column(Integer, nullable=True)   # e.g. 2026 or None for permanent monthly budget
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="budgets")


class SharedSubscription(Base):
    __tablename__ = "shared_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    billing_cycle = Column(String(20), nullable=False)  # MONTHLY, YEARLY, WEEKLY, CUSTOM
    next_renewal_date = Column(Date, nullable=False)
    category = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE")  # ACTIVE, PAUSED, CANCELLED
    auto_renew_expense = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    group = relationship("Group", back_populates="shared_subscriptions")
    creator = relationship("User", foreign_keys=[created_by], back_populates="shared_subscriptions_created")
    payer = relationship("User", foreign_keys=[payer_id], back_populates="shared_subscriptions_paying")
    members = relationship("SharedSubscriptionMember", back_populates="shared_subscription", cascade="all, delete-orphan")


class SharedSubscriptionMember(Base):
    __tablename__ = "shared_subscription_members"

    id = Column(Integer, primary_key=True, index=True)
    shared_subscription_id = Column(Integer, ForeignKey("shared_subscriptions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    share_amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("shared_subscription_id", "user_id", name="uq_shared_sub_member"),)

    shared_subscription = relationship("SharedSubscription", back_populates="members")
    user = relationship("User", back_populates="shared_subscription_memberships")







