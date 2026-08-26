using worksync.db as db from '../db/schema';

@requires: 'authenticated-user'
//@(requires: 'Employee')
service EmployeeService {

    type ProjectTeamMember {
        EMP_ID : String(20);
        NAME : String(100);
        EMAIL : String(100);
        PROJECT_ROLE : String(50);
        ALLOCATION_PERCENTAGE : Decimal(5,2);
        START_DATE : Date;
        END_DATE : Date;
    };

    type ProjectDetails {
        ID : UUID;
        PROJECT_ID : String(20);
        PROJECT_NAME : String(100);
        DESCRIPTION : LargeString;
        START_DATE : Date;
        END_DATE : Date;
        STATUS : db.ProjectStatus;
        PRIORITY : db.ProjectPriority;
        // Logged-in employee's allocation
        MY_ROLE : String(50);
        MY_ALLOCATION : Decimal(5,2);
        MY_START_DATE : Date;
        MY_END_DATE : Date;
        // Project information
        TEAM_SIZE : Integer;
        TOTAL_ALLOCATION : Decimal(7,2);
        // Employees currently working on project
        TEAM_MEMBERS : many ProjectTeamMember;
    };
    entity MyProfile  as projection on db.EMPLOYEES;
    entity MySkills as projection on db.EMPLOYEE_SKILLS { *,skill };
    entity MyProjects as projection on db.ALLOCATIONS { *,project };
    entity AllocationHistory as projection on db.ALLOCATION_HISTORY;
    entity MyLeaves   as projection on db.LEAVE_CALENDAR;

    action GetMyCurrentProjectDetails(
        projectId : UUID
    ) returns ProjectDetails;


    action GetMyProjectHistoryDetails(
        projectId : UUID
    ) returns ProjectDetails;

    @readonly
    entity MyLeaveBalance as projection on db.LEAVE_BALANCE;
    action ApplyLeave(leaveType: db.LeaveType,
                      leaveFrom: Date,
                      leaveTo: Date,
                      reason: String);
    action CancelLeave(
        leaveId : UUID
    );
    action WithdrawLeave(
        leaveId : UUID
    );

}
