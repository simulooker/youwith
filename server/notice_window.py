"""Calendar-month publication window. Observation/application dates are not substitutes."""
from calendar import monthrange
from datetime import date, datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

KST=timezone(timedelta(hours=9))

def published_date(value):
    if not isinstance(value,str) or not value.strip():return None
    value=value.strip()
    try:
        if len(value)==10:return date.fromisoformat(value)
        stamp=datetime.fromisoformat(value.replace('Z','+00:00'))
    except ValueError:
        try:stamp=parsedate_to_datetime(value)
        except (ValueError,TypeError,OverflowError):return None
    return stamp.astimezone(KST).date() if stamp.tzinfo else stamp.date()

def cutoff(today):
    day=date.fromisoformat(today) if isinstance(today,str) else today
    index=day.year*12+day.month-1-2;year,month=divmod(index,12);month+=1
    return date(year,month,min(day.day,monthrange(year,month)[1]))

def within_window(value,today):
    day=date.fromisoformat(today) if isinstance(today,str) else today
    published=published_date(value)
    return published is not None and cutoff(day)<=published<=day
