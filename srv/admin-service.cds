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

    entity AllocationHistory as projection on db.ALLOCATION_HISTORY;

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
    // type graphStats 
    type EmployeeMetrics {
        // Employee
        ID                      : UUID;
        EMP_ID                  : String(20);
        NAME                    : String(100);
        EMAIL                   : String(100);
        DESIGNATION             : String(100);
        STATUS                  : db.EmployeeStatus;
        EXPERIENCE              : Decimal(4, 1);
        JOINING_DATE            : Date;

        // Allocation
        TOTAL_ALLOCATION        : Decimal(5, 2);
        AVAILABLE_PERCENT       : Decimal(5, 2);
        PROJECT_COUNT           : Integer;
        ACTIVE_PROJECT_COUNT    : Integer;
        COMPLETED_PROJECT_COUNT : Integer;

        // Leave
        PENDING_LEAVES          : Integer;
        APPROVED_LEAVES         : Integer;
        REJECTED_LEAVES         : Integer;

        CASUAL_AVAILABLE        : Integer;
        CASUAL_USED             : Integer;
        SICK_AVAILABLE          : Integer;
        SICK_USED               : Integer;
        EARNED_AVAILABLE        : Integer;
        EARNED_USED             : Integer;

        // Skills
        TOTAL_SKILLS            : Integer;
        BEGINNER_SKILLS         : Integer;
        INTERMEDIATE_SKILLS     : Integer;
        ADVANCED_SKILLS         : Integer;
        EXPERT_SKILLS           : Integer;

        // Utilization
        CURRENT_UTILIZATION     : Decimal(5, 2);
        IS_AVAILABLE            : Boolean;
        IS_OVER_ALLOCATED       : Boolean;
    }

    function   GetEmployeeMetrics()    returns array of EmployeeMetrics;

    // function SearchEmployees(search: String,
    //                          status: String,
    //                          designation: String,
    //                          minExp: Decimal(4, 1),
    //                          maxExp: Decimal(4, 1),
    //                          skip: Integer,
    //                          top: Integer)               returns array of EMPLOYEES;

    type ProjectSkillInput {
        ID                 : UUID;
        skill_ID           : UUID;
        REQUIRED_LEVEL     : String;
        REQUIRED_RESOURCES : Integer;
    }

    type ProjectUpdateInput {
        PROJECT_NAME : String(100);
        DESCRIPTION  : LargeString;
        START_DATE   : Date;
        END_DATE     : Date;
        STATUS       : String;
        manager_ID   : UUID;
        skills       : many ProjectSkillInput;
    }

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

    function GetResourceForecast()                       returns array of ResourceForecast;

    function GetCurrentUser()                            returns {
        id         : String;
        isAdmin    : Boolean;
        isEmployee : Boolean;
    };

    function GetDashboardStats()                         returns {

        // Employee
        totalEmployees          : Integer;
        availableEmployees      : Integer;
        benchEmployees          : Integer;
        underAllocatedEmployees : Integer;
        fullyAllocatedEmployees : Integer;
        overAllocatedEmployees  : Integer;

        // Projects
        totalProjects           : Integer;
        activeProjects          : Integer;
        upcomingProjects        : Integer;
        completedProjects       : Integer;
        onHoldProjects          : Integer;

        // Allocations
        totalAllocations        : Integer;
        averageUtilization      : Decimal(5, 2);

        // Leaves
        totalLeaves             : Integer;
        pendingLeaves           : Integer;
        approvedLeaves          : Integer;
        rejectedLeaves          : Integer;

        // Master Data
        totalSkills             : Integer;
        totalDesignations       : Integer;
    };

    action   AllocateEmployee(employeeId: UUID,
                              projectId: UUID,
                              allocation: Decimal(5, 2),
                              projectRole: String,
                              startDate: Date,
                              endDate: Date)             returns {
        message : String;
    };

    function currentUser()                               returns {
        isAdmin    : Boolean;
        isEmployee : Boolean;
        email      : String;
    };

    action   UpdateProject(projectId: UUID,
                           project: ProjectUpdateInput)  returns {
        message : String;
    };

}
