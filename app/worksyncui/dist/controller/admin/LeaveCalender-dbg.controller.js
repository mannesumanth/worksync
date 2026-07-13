sap.ui.define([
    "sap/ui/core/mvc/Controller"]
, function (
    Controller
) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.admin.LeaveCalender", {
        onApproveLeave: function (oEvent) {
            const oLeave =
                oEvent.getSource().getBindingContext().getObject();
            this._updateLeaveStatus(
                oLeave.ID,
                "APPROVED"
            );
        },
        onRejectLeave: function (oEvent) {
            const oLeave = oEvent.getSource().getBindingContext().getObject();
            this._updateLeaveStatus(
                oLeave.ID,
                "REJECTED"
            );
        },
        _updateLeaveStatus: async function (
            leaveId,
            status
        ) {
            try {
                const response = await fetch("/odata/v4/admin/ApproveLeave",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            leaveId,
                            status
                        })
                    }
                );
                if (!response.ok) {
                    throw new Error("Failed to update leave");
                }
                sap.m.MessageToast.show(
                    "Leave " +
                    status.toLowerCase() +
                    " successfully"
                );
                this.getView().getModel().refresh();
                this._loadLeaveBreakdown();
                this._loadAvailabilityForecast();
            } catch (error) {
                sap.m.MessageBox.error(
                    error.message
                );
            }
        },
    });
});
