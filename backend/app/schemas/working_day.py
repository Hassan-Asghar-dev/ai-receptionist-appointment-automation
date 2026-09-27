from pydantic import BaseModel, ConfigDict, Field


class WorkingDayCreate(BaseModel):
    dentist_id: int
    day_of_week: int = Field(ge=0, le=6)
    is_working: bool = True


class WorkingDayUpdate(BaseModel):
    is_working: bool


class WorkingDayResponse(BaseModel):
    id: int
    dentist_id: int
    day_of_week: int
    is_working: bool

    model_config = ConfigDict(from_attributes=True)