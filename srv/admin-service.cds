using worksync.db as db from '../db/schema';

// @requires: 'Admin'
// @(path: '/odata/v4/admin')

service AdminService{

    // Core Entities
    entity EMPLOYEES             as projection on db.EMPLOYEES;
    entity DESIGNATIONS          as projection on db.DESIGNATIONS;

    entity SKILL_CATEGORIES      as projection on db.SKILL_CATEGORIES;
    entity SKILLS                as projection on db.SKILLS;
    entity EMPLOYEE_SKILLS       as projection on db.EMPLOYEE_SKILLS;

    entity PROJECTS              as projection on db.PROJECTS;
    entity PROJECT_REQUIREMENTS  as projection on db.PROJECT_REQUIREMENTS;
    entity REQUIREMENT_SKILLS    as projection on db.REQUIREMENT_SKILLS;

    entity ALLOCATIONS           as projection on db.ALLOCATIONS;

    entity LEAVE_CALENDAR        as projection on db.LEAVE_CALENDAR;

    entity LEAVE_BALANCE         as projection on db.LEAVE_BALANCE;

    entity EMPLOYEE_BACKUPS      as projection on db.EMPLOYEE_BACKUPS;

    entity PROJECT_RISK_ANALYSIS as projection on db.PROJECT_RISK_ANALYSIS;


    function SearchEmployees(search: String,
                             status: String,
                             designation: String,
                             minExp: Decimal(4, 1),
                             skip: Integer,
                             top: Integer)               returns array of EMPLOYEES;


    action   ApproveLeave(leaveId: UUID, status: String) returns {
        message : String
    };

    function RecommendResources(projectId: UUID)         returns array of {
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


    function DetectSPOF()                                returns array of {
        skill_ID      : UUID;
        SKILL_NAME    : String;
        employee_ID   : UUID;
        EMPLOYEE_NAME : String;
        EMP_ID        : String;
        RISK_LEVEL    : String;
    };

    function GetAvailabilityForecast()                   returns {
        currentMonthAvailable : Integer;
        nextMonthAvailable    : Integer;
        currentMonthLeaves    : Integer;
        nextMonthLeaves       : Integer;
        pendingLeaves         : Integer;
    };

}