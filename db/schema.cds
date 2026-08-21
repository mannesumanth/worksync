namespace worksync.db;
using { managed } from '@sap/cds/common';

// ENUMS
type EmployeeStatus : String enum {
    ACTIVE;
    ON_LEAVE;
    RESIGNED;
    TERMINATED;
}
type ProjectStatus : String enum {
    ACTIVE;
    COMPLETED;
    ON_HOLD;
    UPCOMING;
    CANCELLED;
    DRAFT;
}
type ProjectPriority : String enum {
    LOW;
    MEDIUM;
    HIGH;
    CRITICAL;
}
type LeaveStatus : String enum {
    PENDING;
    APPROVED;
    REJECTED;
    CANCELLED;
    WITHDRAWN;
    WITHDRAW_REQUEST;
}
type LeaveType : String enum {
    CASUAL;
    SICK;
    EARNED;
    MATERNITY;
    PATERNITY;
    UNPAID;
}
type ProficiencyLevel : String enum {
    BEGINNER;
    INTERMEDIATE;
    ADVANCED;
    EXPERT;
}

type Gender : String enum {
    MALE;
    FEMALE;
    OTHER;
}

//EMPLOYEES
entity EMPLOYEES : managed {
    key ID                  : UUID;
    EMP_ID                  : String(20) @readonly @assert.unique;
    NAME                    : String(100) @mandatory @assert.unique;
    EMAIL                   : String(100) @mandatory @assert.unique;
    GENDER                  : Gender @mandatory;
    PHONE_NUMBER            : String(15) @mandatory;
    DATE_OF_BIRTH           : Date @mandatory;
    JOINING_DATE            : Date @mandatory;
    designation            : Association to DESIGNATIONS @mandatory;
    EXPERIENCE              : Decimal(4,1) default 0;
    //PROFILE_PHOTO           : LargeBinary @Core.MediaType: PROFILE_PHOTO_MIME_TYPE;
    //PROFILE_PHOTO_MIME_TYPE : String(100) @Core.IsMediaType: true;
    STATUS                  : EmployeeStatus default 'ACTIVE';
    skills                  : Composition of many EMPLOYEE_SKILLS
                              on skills.employee = $self;
    allocations             : Composition of many ALLOCATIONS
                              on allocations.employee = $self;
    leaves                  : Composition of many LEAVE_CALENDAR
                              on leaves.employee = $self;
    virtual ALLOCATION_PERCENT : Decimal(5,2);
    virtual CURRENT_UTILIZATION : Decimal(5,2);
}

//DESIGNATIONS
entity DESIGNATIONS : managed {
    key ID             : UUID;
    DESIGNATION_ID     : String(20) @readonly @assert.unique;
    NAME               : String(100) @mandatory @assert.unique;
}

  // SKILL CATEGORY
entity SKILL_CATEGORIES : managed {
    key ID                  : UUID;
    CAT_ID                  : String(20) @readonly @assert.unique;
    CATEGORY_NAME           : String(100) @mandatory @assert.unique;
    skills                  : Association to many SKILLS
                                on skills.category = $self;
}
  // SKILLS
entity SKILLS : managed {
    key ID                  : UUID;
    SKILL_ID                : String(20) @readonly @assert.unique;
    SKILL_NAME              : String(100) @mandatory @assert.unique;
    category                : Association to SKILL_CATEGORIES @mandatory ;
}
   // EMPLOYEE SKILLS
entity EMPLOYEE_SKILLS : managed {
    key ID                  : UUID;
    employee                : Association to EMPLOYEES @mandatory;
    skill                   : Association to SKILLS @mandatory;
    PROFICIENCY_LEVEL       : ProficiencyLevel default 'BEGINNER';
}
   //PROJECTS
   entity PROJECTS : managed {
    key ID                  : UUID;
    PROJECT_ID              : String(20) @readonly @assert.unique;
    PROJECT_NAME            : String(100) @mandatory @assert.unique;
    DESCRIPTION             : LargeString @mandatory;
    START_DATE              : Date @mandatory;
    END_DATE                : Date @mandatory;
    STATUS                  : ProjectStatus default 'ACTIVE';
    PRIORITY                : ProjectPriority default 'MEDIUM';
    manager                 : Association to EMPLOYEES;
    requirements            : Composition of many PROJECT_REQUIREMENTS
                              on requirements.project = $self;
    allocations             : Composition of many ALLOCATIONS
                              on allocations.project = $self;
    allocationHistory       : Association to many ALLOCATION_HISTORY
    on allocationHistory.project = $self;
    virtual TEAM_SIZE : Integer;
    virtual TOTAL_ALLOCATION : Decimal(7,2);
}
  // PROJECT REQUIREMENTS
entity PROJECT_REQUIREMENTS : managed {
    key ID                  : UUID;
    REQUIREMENT_ID          : String(20) @readonly @assert.unique;
    project                 : Association to PROJECTS @mandatory;
    requirementSkills       : Composition of many REQUIREMENT_SKILLS
                              on requirementSkills.requirement = $self;
}
   // REQUIREMENT SKILLS
entity REQUIREMENT_SKILLS : managed {
    key ID                  : UUID;
    requirement             : Association to PROJECT_REQUIREMENTS @mandatory;
    skill                   : Association to SKILLS @mandatory;
    REQUIRED_LEVEL          : ProficiencyLevel default 'BEGINNER';
    REQUIRED_RESOURCES      : Integer default 1;
}
   //ALLOCATIONS
entity ALLOCATIONS : managed {
    key ID                  : UUID;
    ALLOCATION_ID           : String(20) @readonly @assert.unique;
    employee                : Association to EMPLOYEES @mandatory;
    project                 : Association to PROJECTS @mandatory;
    @assert.range:[0,100]
    ALLOCATION_PERCENTAGE   : Decimal(5,2);
    PROJECT_ROLE            : String(50);
    START_DATE              : Date @mandatory;
    END_DATE                : Date @mandatory;
}
    //Allocation History
entity ALLOCATION_HISTORY{
    key ID  : UUID;
    ALLOC_HISTORY_ID    : String(20) @readonly @assert.unique;
    //allocation  : Association to ALLOCATIONS @mandatory;
    employee    : Association to EMPLOYEES @mandatory;
    project                 : Association to PROJECTS @mandatory;
    @assert.range:[0,100]
    ALLOCATION_PERCENTAGE   : Decimal(5,2);
    PROJECT_ROLE            : String(50);
    START_DATE              : Date @mandatory;
    END_DATE                : Date @mandatory;
   
       
}
   //LEAVE CALENDAR
entity LEAVE_CALENDAR : managed {
    key ID                  : UUID;
    LEAVE_ID                : String(20) @readonly @assert.unique;
    employee                : Association to EMPLOYEES @mandatory;
    LEAVE_TYPE              : LeaveType @mandatory;
    LEAVE_FROM              : Date  @mandatory;
    LEAVE_TO                : Date @mandatory;
    virtual NO_OF_DAYS      : Integer;
    REASON                  : String(500);
    APPROVED_BY             : Association to EMPLOYEES;
    STATUS                  : LeaveStatus default 'PENDING';
}
entity LEAVE_BALANCE : managed {
    key ID                  : UUID;
    employee                : Association to EMPLOYEES @mandatory;
    YEAR                    : Integer @mandatory;
    CASUAL_AVAILABLE        : Integer default 12;
    CASUAL_USED             : Integer default 0;
    SICK_AVAILABLE          : Integer default 12;
    SICK_USED               : Integer default 0;
    EARNED_AVAILABLE        : Integer default 12;
    EARNED_USED             : Integer default 0;
    
}