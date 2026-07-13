using worksync.db as db from '../db/schema';

@requires: 'authenticated-user'
//@(requires: 'Admin')
service AdminService {

    // Core Entities
    entity EMPLOYEES            as projection on db.EMPLOYEES;
    entity DESIGNATIONS         as projection on db.DESIGNATIONS;

    entity SKILL_CATEGORIES     as projection on db.SKILL_CATEGORIES;
    entity SKILLS               as projection on db.SKILLS;
    entity EMPLOYEE_SKILLS      as projection on db.EMPLOYEE_SKILLS;

    entity PROJECTS             as projection on db.PROJECTS;
    entity PROJECT_REQUIREMENTS as projection on db.PROJECT_REQUIREMENTS;
    entity REQUIREMENT_SKILLS   as projection on db.REQUIREMENT_SKILLS;

    entity ALLOCATIONS          as projection on db.ALLOCATIONS;

    entity LEAVE_CALENDAR       as projection on db.LEAVE_CALENDAR;

    entity LEAVE_BALANCE        as projection on db.LEAVE_BALANCE;
    type ResourceForecast {

        ID                    : UUID;
        EMP_ID                : String(20);
        NAME                  : String(100);
        DESIGNATION           : String(100);

        CURRENT_ALLOCATION    : Decimal(5, 2);
        AVAILABLE_PERCENT     : Decimal(5, 2);

        CURRENT_PROJECT_COUNT : Integer;
        NEXT_PROJECT_COUNT    : Integer;

        CURRENT_PROJECT_NAME  : String(100);

        CURRENT_STATUS        : String(30);
        NEXT_STATUS           : String(30);

        CURRENT_AVAILABLE     : Boolean;
        NEXT_AVAILABLE        : Boolean;

        NEXT_AVAILABLE_DATE   : Date;

        LEAVE_END_DATE        : Date;
        ALLOCATION_END_DATE   : Date;
    }
    type NotificationType : String enum {
        LEAVE;
        PROJECT;
        ALLOCATION;
        SKILL;
        FORECAST;
    }
    type Notification {
        ID         : UUID;
        TITLE      : String(100);
        MESSAGE    : String(500);
        TYPE       : NotificationType;
        CREATED_AT : Timestamp;
    }


    function SearchEmployees(search: String,
                             status: String,
                             designation: String,
                             minExp: Decimal(4, 1),
                             maxExp: Decimal(4, 1),
                             skip: Integer,
                             top: Integer)               
                            returns array of EMPLOYEES;

    action   ApproveLeave(leaveId: UUID, status: String) returns {
        message : String
    };

    function RecommendResources(projectId: UUID)         
        returns array of {
        ID                 : UUID;
        EMP_ID             : String;
        NAME               : String;
        EMAIL              : String;
        MATCHED_SKILLS     : Integer;
        TOTAL_SKILLS       : Integer;
        MATCH_PERCENT      : Decimal(5, 2);
        ALLOCATION_PERCENT : Decimal(5, 2);
        AVAILABLE_PERCENT  : Decimal(5, 2);
    };

    function DetectSPOF() 
        returns array of {
        skill_ID      : UUID;
        SKILL_NAME    : String;
        employee_ID   : UUID;
        EMPLOYEE_NAME : String;
        EMP_ID        : String;
        RISK_LEVEL    : String;
    };

    function GetAvailabilityForecast() returns {
        currentMonthAvailable : Integer;
        nextMonthAvailable    : Integer;
        currentMonthLeaves    : Integer;
        nextMonthLeaves       : Integer;
        pendingLeaves         : Integer;
    };

    function GetResourceForecast() returns array of ResourceForecast;

    function GetCurrentUser() returns {
        id         : String;
        isAdmin    : Boolean;
        isEmployee : Boolean;
    };

    function GetDashboardStats() returns {

        totalEmployees       : Integer;
        availableEmployees   : Integer;
        benchEmployees       : Integer;
        totalProjects        : Integer;
        totalAllocations     : Integer;
        totalLeaves          : Integer;
        pendingLeaves        : Integer;
        approvedLeaves       : Integer;
        rejectedLeaves       : Integer;
    };

    action AllocateEmployee(
        employeeId: UUID,
        projectId: UUID,
        allocation: Decimal(5, 2),
        projectRole: String,
        startDate: Date,
        endDate: Date
    ) returns {
        message : String;
    };
    function GetNotifications()
        returns array of Notification;
}
