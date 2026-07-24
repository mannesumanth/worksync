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
            // Save Allocation
            onSaveAllocation: async function () {
                const oMessageManager = sap.ui.getCore().getMessageManager();
                oMessageManager.removeAllMessages();
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
                console.log(aContexts);
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
                // Allocation Percentage Validation
                const iCurrentAllocation = aContexts
                    .filter(function (oContext) {
                        const oAllocation = oContext.getObject();
                        return oAllocation.employee_ID === sEmployeeId;
                    })
                    .reduce(function (sum, oContext) {
                        return sum + Number(oContext.getObject().ALLOCATION_PERCENTAGE || 0);
                    }, 0);

                const iAvailable = 100 - iCurrentAllocation;

                console.log("Current Allocation:", iCurrentAllocation);
                console.log("Available Allocation:", iAvailable);

                if (iAllocation > iAvailable) {
                    MessageBox.warning(
                        `Allocation exceeds 100%. Current allocation is ${iCurrentAllocation}%. ` +
                        `Only ${iAvailable}% is available for this employee.`
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
                const oAllocationContext = oEvent.getSource().getBindingContext();
                if (!this._oEditAllocationDialog) {
                    this._oEditAllocationDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.EditAllocation",
                        controller: this
                    });
                    this.getView().addDependent(this._oEditAllocationDialog);
                }
                // Keep the OData context for saving later
                this._oCurrentAllocationContext = oAllocationContext;
                // Create a copy of the allocation data
                const oAllocationData = structuredClone(oAllocationContext.getObject());
                // JSON model for editing
                const oEditModel = new sap.ui.model.json.JSONModel(oAllocationData);
                this._oEditAllocationDialog.setModel(oEditModel, "editAllocation");
                this._oEditAllocationDialog.open();
            },

            onUpdateAllocation: async function () {
                const oMessageManager = sap.ui.getCore().getMessageManager();
                oMessageManager.removeAllMessages();

                try {

                    const oEditData = this._oEditAllocationDialog
                        .getModel("editAllocation")
                        .getData();
                    const oContext = this._oCurrentAllocationContext;
                    oContext.setProperty("PROJECT_ROLE", oEditData.PROJECT_ROLE);
                    oContext.setProperty("ALLOCATION_PERCENTAGE", oEditData.ALLOCATION_PERCENTAGE);
                    oContext.setProperty("START_DATE", oEditData.START_DATE);
                    oContext.setProperty("END_DATE", oEditData.END_DATE);
                    await this.getView().getModel().submitBatch("$auto");
                    const aMessages = oMessageManager
                        .getMessageModel()
                        .getData();
                    const oBackendError = aMessages.find(function (m) {
                        return m.type === sap.ui.core.MessageType.Error;
                    });
                    if (oBackendError) {
                        MessageBox.error(oBackendError.message);
                        return;
                    }
                    MessageToast.show("Allocation updated successfully.");
                    this._oEditAllocationDialog.close();
                    await this.getView().getElementBinding().refresh();
                } catch (oError) {
                    MessageBox.error(oError.message || "Update failed.");
                }
            },
            onCancelEditAllocation: function () {
                if (this._oEditAllocationDialog) {
                    this._oEditAllocationDialog.close();
                }
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
            //Edit Project Dialog
            onEditProjectPress: async function () {
                if (!this._oEditProjectDialog) {
                    this._oEditProjectDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.EditProject",
                        controller: this
                    });
                    this.getView().addDependent(this._oEditProjectDialog);
                }
                const oProject = this.getView()
                    .getBindingContext()
                    .getObject();
                const aSkills = [];
                console.log("Project:", oProject);
                console.log("Manager:", oProject.manager);
                console.log("Requirements:", oProject.requirements);
                (oProject.requirements || []).forEach(function (oRequirement) {
                    (oRequirement.requirementSkills || []).forEach(function (oSkill) {
                        console.log("Requirement Skill:", oSkill);
                        aSkills.push({
                            ID: oSkill.ID,
                            skill_ID: oSkill.skill.ID,
                            REQUIRED_LEVEL: oSkill.REQUIRED_LEVEL,
                            REQUIRED_RESOURCES: oSkill.REQUIRED_RESOURCES
                        });
                    });
                });
                console.log("Skills:", aSkills);
                const oEditModel = new sap.ui.model.json.JSONModel({
                    ID: oProject.ID,
                    PROJECT_NAME: oProject.PROJECT_NAME,
                    DESCRIPTION: oProject.DESCRIPTION,
                    START_DATE: oProject.START_DATE,
                    END_DATE: oProject.END_DATE,
                    STATUS: oProject.STATUS,
                    manager_ID: oProject.manager.ID,
                    skills: aSkills

                });

                this.getView().setModel(oEditModel, "editProject");
                this._oEditProjectDialog.open();
            },
            onAddEditRequiredSkill: function () {
                const oModel = this.getView().getModel("editProject");
                const aSkills = oModel.getProperty("/skills") || [];
                aSkills.push({
                    ID: null,
                    skill_ID: "",
                    REQUIRED_LEVEL: "BEGINNER",
                    REQUIRED_RESOURCES: 1
                });
                oModel.setProperty("/skills", aSkills);

            },
            onDeleteEditRequiredSkill: function (oEvent) {
                const oTable = this.byId("editRequiredSkillsTable");
                const oItem = oEvent.getSource().getParent();
                const iIndex = oTable.indexOfItem(oItem);
                const oModel = this.getView().getModel("editProject");
                const aSkills = oModel.getProperty("/skills");
                MessageBox.confirm(
                    "Remove this required skill?",
                    {
                        actions: [
                            MessageBox.Action.YES,
                            MessageBox.Action.NO
                        ],
                        onClose: function (sAction) {
                            if (sAction === MessageBox.Action.YES) {
                                aSkills.splice(iIndex, 1);
                                oModel.setProperty("/skills", aSkills);
                            }
                        }
                    }
                );
            },
            onCloseEditProjectDialog: function () {
                MessageBox.confirm(
                    "Discard all changes?",
                    {
                        actions: [
                            MessageBox.Action.YES,
                            MessageBox.Action.NO
                        ],
                        onClose: (sAction) => {
                            if (sAction === MessageBox.Action.YES) {
                                this.getView()
                                    .getModel("editProject")
                                    .setData({});

                                this._oEditProjectDialog.close();

                            }
                        }
                    }
                );
            },
            onUpdateProject: async function () {
                const oView = this.getView();
                const oModel = oView.getModel();
                const oProject = oView
                    .getBindingContext()
                    .getObject();
                const oEdit = oView
                    .getModel("editProject")
                    .getData();
                    const dStart = new Date(oEdit.START_DATE);
                    const dEnd = new Date(oEdit.END_DATE);
                // Validation
                if (!oEdit.PROJECT_NAME) {
                    MessageBox.error("Project Name is required.");
                    return;
                }
                if (!oEdit.START_DATE || !oEdit.END_DATE) {
                    MessageBox.error("Start Date and End Date are required.");
                    return;
                }
                if (dStart > dEnd) {
                    MessageBox.error("End Date cannot be before Start Date.");
                    return;
                }
                if (!oEdit.manager_ID) {
                    MessageBox.error("Please select a Project Manager.");
                    return;
                }
                if (!oEdit.skills.length) {
                    MessageBox.error("Please add at least one required skill.");
                    return;
                }
                // Duplicate Skill Validation
                const aSkillIds = oEdit.skills.map(s => s.skill_ID);
                if (new Set(aSkillIds).size !== aSkillIds.length) {
                    MessageBox.error("Duplicate skills are not allowed.");
                    return;
                }
                this._oEditProjectDialog.setBusy(true);
                try {
                    const oAction = oModel.bindContext("/UpdateProject(...)");
                    oAction.setParameter("projectId", oProject.ID);
                    oAction.setParameter("project", {
                        PROJECT_NAME: oEdit.PROJECT_NAME,
                        DESCRIPTION: oEdit.DESCRIPTION,
                        START_DATE: dStart.toISOString().split("T")[0],
                        END_DATE: dEnd.toISOString().split("T")[0],
                        STATUS: oEdit.STATUS,
                        manager_ID: oEdit.manager_ID,
                        skills: oEdit.skills.map(function (oSkill) {
                            return {
                                ID: oSkill.ID,
                                skill_ID: oSkill.skill_ID,
                                REQUIRED_LEVEL: oSkill.REQUIRED_LEVEL,
                                REQUIRED_RESOURCES: Number(oSkill.REQUIRED_RESOURCES)
                            };
                        })
                    });

                    await oAction.execute();
                    MessageToast.show("Project updated successfully.");
                    this._oEditProjectDialog.close();
                    // Refresh Project Detail
                    await oView.getElementBinding().refresh();
                    // Refresh Allocations
                    if (this._loadAllocations) {
                        await this._loadAllocations();
                    }
                    // Refresh Projects List
                    sap.ui.getCore()
                        .getEventBus()
                        .publish("Projects", "Refresh");

                } catch (oError) {
                    console.error(oError);
                    MessageBox.error(
                        oError.message || "Failed to update project."
                    );
                } finally {

                    this._oEditProjectDialog.setBusy(false);

                }

            },

            onViewProject: function (oEvent) {
                const sId = oEvent.getSource()
                    .getBindingContext()
                    .getProperty("ID");

                const oFCL = this.getOwnerComponent()
                    .getRootControl()
                    .byId("fcl");
                oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("ProjectDetail", {
                        projectId: sId
                    });
            },
        }
    );
});
