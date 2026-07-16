sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, MessageBox, JSONModel, Fragment) {
    "use strict";

    return Controller.extend(
        "com.amista.worksyncui.controller.ProjectDetail",
        {

            // INIT — Attach route pattern handler

            onInit: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("ProjectDetail")
                    .attachPatternMatched(this._onObjectMatched, this);
                this.getView().setModel(
                    new JSONModel({ resources: [] }),
                    "recommend"
                );
                this.getView().setModel(
                    new JSONModel({
                        busy: false
                    }),
                    "ui"
                );
            },


            //  Bind the view to the correct Project

            _onObjectMatched: function (oEvent) {
                const sProjectId = oEvent.getParameter("arguments").projectId;
                this.getView().bindElement({
                    path: "/PROJECTS(" + sProjectId + ")",
                    parameters: {
                        $expand: "manager,requirements($expand=requirementSkills($expand=skill)),allocations($expand=employee)"
                    },
                    events: {
                        dataReceived: async (oData) => {
                            if (!oData.getParameter("data")) {
                                MessageToast.show("Project not found");
                                this.onNavBack();
                            }
                            await this._loadRecommendedResources(sProjectId);
                        }
                    }
                });
            },

            // NAVIGATION — Back button
            onNavBack: function () {

                const oFCL = this.getOwnerComponent()
                    .getRootControl()
                    .byId("fcl");

                oFCL.setLayout(
                    sap.f.LayoutType.OneColumn
                );

                window.history.back();
            },

            // EDIT Project Status
            onProjectStatusChange: async function (oEvent) {

                try {
                    await this.getView().getModel().submitBatch("$auto");
                    MessageToast.show("Project status updated successfully.");
                } catch (oError) {
                    MessageBox.error(oError.message || "Status update failed.");
                }
            },

            _loadRecommendedResources: async function (sProjectId) {
                const oModel = this.getView().getModel();
                try {
                    const oAction = oModel.bindContext(
                        "/RecommendResources(...)"
                    );
                    oAction.setParameter("projectId", sProjectId);
                    await oAction.execute();
                    const oResult = oAction.getBoundContext().getObject();
                    this.getView()
                        .getModel("recommend")
                        .setProperty("/resources", oResult.value);

                } catch (e) {
                    MessageBox.error(e.message);
                }
            },
            onAssignEmployee: async function () {

                if (!this._oAssignAllocationDialog) {

                    this._oAssignAllocationDialog = await sap.ui.core.Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.AssignAllocation",
                        controller: this
                    });

                    this.getView().addDependent(this._oAssignAllocationDialog);
                }

                const oProject = this.getView().getBindingContext().getObject();

                this.byId("allocationStartDate")
                    .setDateValue(new Date(oProject.START_DATE));

                this.byId("allocationEndDate")
                    .setDateValue(new Date(oProject.END_DATE));

                this.byId("allocationEmployee").setSelectedKey("");
                this.byId("allocationRole").setValue("");
                this.byId("allocationPercent").setValue(25);
                this._oAssignAllocationDialog.open();

            },
            onCloseAssignAllocation: function () {

                this._oAssignAllocationDialog.close();

            },
            onSaveAllocation: async function () {
                const oView = this.getView();
                const oModel = oView.getModel();
                const oProject = oView.getBindingContext().getObject();
                const oEmployee = sap.ui.core.Fragment.byId(
                    oView.getId(),
                    "allocationEmployee"
                );
                const oRole = sap.ui.core.Fragment.byId(
                    oView.getId(),
                    "allocationRole"
                );
                const oPercent = sap.ui.core.Fragment.byId(
                    oView.getId(),
                    "allocationPercent"
                );
                const oStart = sap.ui.core.Fragment.byId(
                    oView.getId(),
                    "allocationStartDate"
                );
                const oEnd = sap.ui.core.Fragment.byId(
                    oView.getId(),
                    "allocationEndDate"
                );
                const sEmployeeId = oEmployee.getSelectedKey();
                const sRole = oRole.getValue().trim();
                const iAllocation = Number(oPercent.getValue());
                const dStart = oStart.getDateValue();
                const dEnd = oEnd.getDateValue();

                // Basic Validation
                if (!sEmployeeId) {
                    MessageBox.warning("Please select an employee.");
                    return;
                }
                if (!sRole) {
                    MessageBox.warning("Please enter project role.");
                    return;
                }
                if (iAllocation <= 0 || iAllocation > 100) {
                    MessageBox.warning("Allocation percentage must be between 1 and 100.");
                    return;
                }
                if (!dStart || !dEnd) {
                    MessageBox.warning("Please select Start Date and End Date.");
                    return;
                }
                if (dStart > dEnd) {
                    MessageBox.warning("Start Date cannot be after End Date.");
                    return;
                }

                // Project Date Validation
                const projectStart = new Date(oProject.START_DATE);
                const projectEnd = new Date(oProject.END_DATE);

                if (dStart < projectStart || dEnd > projectEnd) {
                    MessageBox.warning(
                        "Allocation dates must be within the project duration."
                    );
                    return;
                }
                // Duplicate Validation
                const oBinding = oModel.bindList("/ALLOCATIONS");
                // Load all allocations from backend
                const aContexts = await oBinding.requestContexts();
                const bExists = aContexts.some(function (oContext) {
                    const oAllocation = oContext.getObject();
                    return (
                        oAllocation.project_ID === oProject.ID &&
                        oAllocation.employee_ID === sEmployeeId
                    );
                });

                if (bExists) {
                    MessageBox.warning(
                        "Employee is already allocated to this project."
                    );
                    return;
                }
                // Available Allocation
                // const aRecommended =
                //     this.getView()
                //         .getModel("recommend")
                //         .getProperty("/resources") || [];

                // const oRecommendedEmployee =
                //     aRecommended.find(function (oEmp) {
                //         return oEmp.ID === sEmployeeId;
                //     });

                // // if (!oRecommendedEmployee) {
                // //     MessageBox.error("Selected employee not found.");
                // //     return;
                // // }

                // if (iAllocation > oRecommendedEmployee.AVAILABLE_PERCENT) {

                //     MessageBox.warning(
                //         "Employee has only " +
                //         oRecommendedEmployee.AVAILABLE_PERCENT +
                //         "% allocation available."
                //     );

                //     return;
                // }
                const iCurrentAllocation = aContexts
                    .filter(function (oContext) {

                        const oAllocation = oContext.getObject();

                        return (
                            oAllocation.employee_ID === sEmployeeId &&
                            oAllocation.STATUS !== "RELEASED"
                        );

                    })
                    .reduce(function (sum, oContext) {

                        return sum + oContext.getObject().ALLOCATION_PERCENTAGE;

                    }, 0);

                const iAvailable = 100 - iCurrentAllocation;

                if (iAllocation > iAvailable) {

                    MessageBox.warning(
                        "Employee has only " + iAvailable + "% allocation available."
                    );

                    return;
                }
                const oPayload = {
                    employee: {
                        ID: sEmployeeId
                    },
                    project: {
                        ID: oProject.ID
                    },
                    PROJECT_ROLE: sRole,
                    ALLOCATION_PERCENTAGE: iAllocation,
                    START_DATE: this._formatDate(dStart),
                    END_DATE: this._formatDate(dEnd)

                };
                console.log("Allocation Payload", oPayload);
                try {
                    oView.getModel("ui").setProperty("/busy", true);
                    const oContext =
                        oModel.bindList("/ALLOCATIONS").create(oPayload);
                    await oContext.created();
                    MessageToast.show("Employee assigned successfully.");
                    this._oAssignAllocationDialog.close();
                    // Refresh Project Details
                    oView.getBindingContext().refresh();
                    // Refresh Recommendation Table
                    await this._loadRecommendedResources(oProject.ID);
                } catch (oError) {
                    console.error(oError);
                    MessageBox.error(
                        oError.message || "Failed to assign employee."
                    );
                } finally {
                    oView.getModel("ui").setProperty("/busy", false);
                }

            },
            _formatDate: function (oDate) {
                const year = oDate.getFullYear();
                const month = String(oDate.getMonth() + 1).padStart(2, "0");
                const day = String(oDate.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            },
            onEditAllocation: async function (oEvent) {
                if (!this._oEditAllocationDialog) {
                    this._oEditAllocationDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.EditAllocation",
                        controller: this
                    });
                    this.getView().addDependent(this._oEditAllocationDialog);
                }
                const oAllocationContext = oEvent.getSource().getBindingContext();
                const sAllocationId = oAllocationContext.getProperty("ID");
                this._oEditAllocationDialog.bindElement({
                    path: "/ALLOCATIONS(" + sAllocationId + ")",
                    parameters: {
                        $expand: "employee"
                    }
                });
                this._oEditAllocationDialog.open();
            },
            onUpdateAllocation: async function () {
                try {
                    await this.getView().getModel().submitBatch("$auto");
                    MessageToast.show("Allocation updated successfully.");
                    this._oEditAllocationDialog.close();
                    this.getView().getBindingContext().refresh();
                    await this._loadRecommendedResources(
                        this.getView().getBindingContext().getObject().ID
                    );
                } catch (e) {
                    MessageBox.error(e.message);
                }
            },
            onCancelEditAllocation: function () {
                const oModel =
                    this.getView().getModel();
                if (oModel.hasPendingChanges()) {
                    oModel.resetChanges();

                }

                this._oEditAllocationDialog.close();

            },
            onDeleteAllocation: function (oEvent) {

                const oContext =
                    oEvent.getSource().getBindingContext();

                const sProjectId =
                    this.getView()
                        .getBindingContext()
                        .getObject().ID;

                MessageBox.confirm(

                    "Remove this allocation?",

                    {

                        actions: [
                            MessageBox.Action.YES,
                            MessageBox.Action.NO
                        ],

                        onClose: async (sAction) => {

                            if (
                                sAction !==
                                MessageBox.Action.YES
                            ) {

                                return;

                            }

                            try {

                                await oContext.delete("$auto");

                                MessageToast.show(
                                    "Allocation removed."
                                );

                                this.getView()
                                    .getBindingContext()
                                    .refresh();

                                await this._loadRecommendedResources(
                                    sProjectId
                                );

                            } catch (oError) {

                                MessageBox.error(
                                    oError.message
                                );

                            }

                        }

                    }

                );

            },
            onEditProjectPress: function () {
                const pId = this.getView().getBindingContext().getProperty("ID");
                const oFCL = this.getOwnerComponent()
                    .getRootControl()
                    .byId("fcl");

                oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);

                this.getOwnerComponent()
                    .getRouter()
                    .navTo("EditProject", {
                        projectId: pId
                    }); 
            }

            //        onViewProject: function (oEvent) {
        //     const sId = oEvent.getSource()
        //         .getBindingContext()
        //         .getProperty("ID");

        //     const oFCL = this.getOwnerComponent()
        //         .getRootControl()
        //         .byId("fcl");

        //     oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);

        //     this.getOwnerComponent()
        //         .getRouter()
        //         .navTo("ProjectDetail", {
        //             projectId: sId
        //         });
        // },
        }
    );
});
