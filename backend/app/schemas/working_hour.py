from datetime import time

from pydantic import BaseModel, ConfigDict, model_validator


class WorkingHourCreate(BaseModel):
    dentist_id: int
    day_of_week: int
    start_time: time
    end_time: time
    break_start: time | None = None
    break_end: time | None = None

    @model_validator(mode="after")
    def validate_times(self):
        if not 0 <= self.day_of_week <= 6:
            raise ValueError(
                "day_of_week must be between 0 and 6"
            )

        if self.start_time >= self.end_time:
            raise ValueError(
                "start_time must be before end_time"
            )

        if (self.break_start is None) != (self.break_end is None):
            raise ValueError(
                "break_start and break_end must both be provided"
            )

        if self.break_start is not None and self.break_end is not None:
            if self.break_start >= self.break_end:
                raise ValueError(
                    "break_start must be before break_end"
                )

            if self.break_start < self.start_time:
                raise ValueError(
                    "break_start must be within working hours"
                )

            if self.break_end > self.end_time:
                raise ValueError(
                    "break_end must be within working hours"
                )

        return self


class WorkingHourUpdate(BaseModel):
    start_time: time | None = None
    end_time: time | None = None
    break_start: time | None = None
    break_end: time | None = None

    @model_validator(mode="after")
    def validate_times(self):
        if self.start_time is not None and self.end_time is not None:
            if self.start_time >= self.end_time:
                raise ValueError(
                    "start_time must be before end_time"
                )

        if (self.break_start is None) != (self.break_end is None):
            raise ValueError(
                "break_start and break_end must both be provided"
            )

        if self.break_start is not None and self.break_end is not None:
            if self.break_start >= self.break_end:
                raise ValueError(
                    "break_start must be before break_end"
                )

        return self


class WorkingHourResponse(BaseModel):
    id: int
    dentist_id: int
    day_of_week: int
    start_time: time
    end_time: time
    break_start: time | None
    break_end: time | None

    model_config = ConfigDict(from_attributes=True)