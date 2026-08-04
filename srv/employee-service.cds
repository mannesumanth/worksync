using worksync.db as db from '../db/schema';

//@requires: 'authenticated-user'
@(requires: 'Employee')
service EmployeeService {
    entity MyProfile  as projection on db.EMPLOYEES;
    entity MySkills as projection on db.EMPLOYEE_SKILLS { *,skill };
    entity MyProjects as projection on db.ALLOCATIONS { *,project };
    entity MyLeaves   as projection on db.LEAVE_CALENDAR;
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
