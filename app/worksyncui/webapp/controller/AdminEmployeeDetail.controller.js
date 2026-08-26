sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/f/LayoutType",
    "sap/m/MessageBox"
], function (
    Controller,
    History,
    MessageToast,
    Fragment,
    LayoutType,
    MessageBox,
) {
    "use strict";

    return Controller.extend(
        "com.amista.worksyncui.controller.AdminEmployeeDetail",
        {

            onInit: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("AdminEmployeeDetail")
                    .attachPatternMatched(
                        this._onObjectMatched,
                        this
                    );
                sap.ui.getCore().getEventBus().subscribe(
                    "Skills",
                    "Refresh",
                    this._refreshSkillDropdown,
                    this
                );
            },
            formatProfilePhoto: function (sEmployeeId) {

                if (!sEmployeeId) {
                    return "";
                }

                return "/odata/v4/admin/EMPLOYEES(" +
                    sEmployeeId +
                    ")/PROFILE_PHOTO";
            },
            _refreshSkillDropdown: function () {

                const oCombo = this.byId("employeeSkillCombo");

                if (oCombo) {
                    oCombo.getBinding("items")?.refresh();
                }

            }, onExit: function () {

                sap.ui.getCore().getEventBus().unsubscribe(
                    "Skills",
                    "Refresh",
                    this._refreshSkillDropdown,
                    this
                );

            },
            //Match object to the employee detail view
            _onObjectMatched: function (oEvent) {
                const sEmployeeId = oEvent.getParameter("arguments").employeeId;
                this.getView().bindElement({
                    path: "/EMPLOYEES('" + sEmployeeId + "')",
                    parameters: {
                        $expand: "designation,skills($expand=skill),allocations($expand=project)"
                    }
                });
            },
            onNavBack: function () {
                this.getOwnerComponent().getRouter().navTo("Admin");
                sap.ui.getCore().getEventBus().publish("Admin", "BackToEmployees");
            },
            //Add Employee Skill
            onAddEmployeeSkill: async function () {
                if (!this._oEmployeeSkillDialog) {
                    this._oEmployeeSkillDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.AddEmployeeSkill",
                        controller: this
                    });
                    this.getView().addDependent(this._oEmployeeSkillDialog);
                }
                this._oEmployeeSkillDialog.open();
            },

            //Close Employee Skill Dialog
            onCloseEmployeeSkill: function () {
                this._clearEmployeeSkillForm();
                this._oEmployeeSkillDialog.close();

            },

            //Save Employee Skill
            onSaveEmployeeSkill: async function () {
                const oModel = this.getView().getModel();
                const oEmployee = this.getView().getBindingContext().getObject();
                const sSkillId = this.byId("employeeSkillCombo").getSelectedKey();
                const sLevel = this.byId("addproficiencyLevel").getSelectedKey();
                if (!sSkillId) {
                    MessageToast.show("Please select a skill.");
                    return;
                }

                try {
                    // Check whether the employee already has this skill
                    const oSkillBinding = oModel.bindList("/EMPLOYEE_SKILLS");
                    const aContexts = await oSkillBinding.requestContexts();
                    const bExists = aContexts.some((oContext) => {
                        const oData = oContext.getObject();
                        return (
                            oData.employee_ID === oEmployee.ID &&
                            oData.skill_ID === sSkillId
                        );
                    });
                    if (bExists) {
                        MessageBox.warning("Employee already has this skill.");
                        return;
                    }
                    const oPayload = {
                        employee_ID: oEmployee.ID,
                        skill_ID: sSkillId,
                        PROFICIENCY_LEVEL: sLevel
                    };
                    const oContext = oModel
                        .bindList("/EMPLOYEE_SKILLS")
                        .create(oPayload);
                    await oContext.created();
                    MessageToast.show("Skill assigned successfully.");
                    this.getView().getBindingContext().refresh();
                    this._clearEmployeeSkillForm();
                    this._oEmployeeSkillDialog.close();
                } catch (e) {
                    MessageBox.error(e.message);
                }
            },

            //Edit Employee
            onEditEmployee: async function () {
                if (!this._oEditDialog) {

                    this._oEditDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.EditEmployee",
                        controller: this
                    });
                    this.getView().addDependent(this._oEditDialog);
                }
                const oDesignationBinding = this.byId("editDesignation").getBinding("items");

                if (oDesignationBinding) {
                    oDesignationBinding.refresh();
                }
                const oEmployee = structuredClone(
                    this.getView()
                        .getBindingContext()
                        .getObject()
                );
                // Keep designation_ID for Select
                if (!oEmployee.designation_ID && oEmployee.designation) {
                    oEmployee.designation_ID = oEmployee.designation.ID;
                }
                this._oOriginalEmployee = structuredClone(oEmployee);
                this._oEditDialog.setModel(
                    new sap.ui.model.json.JSONModel(oEmployee),
                    "edit"
                );
                this._oEditDialog.open();
            },

            //Update Employee
            //Update Employee
            onUpdateEmployee: async function () {
                if (!this._validateEditEmployeeForm()) {
                    MessageBox.error("Please correct the highlighted fields.");
                    return;
                }

                const oEditData = this._oEditDialog.getModel("edit").getData();
                const oOriginal = this._oOriginalEmployee;

                const sNewStatus = String(oEditData.STATUS ?? "");
                const sOldStatus = String(oOriginal.STATUS ?? "");
                const aLockedStatuses = ["RESIGNED", "TERMINATED"];

                // If the status is being changed TO Resigned/Terminated, warn the user
                // that this is a one-way change before we let them proceed.
                if (aLockedStatuses.includes(sNewStatus) && sNewStatus !== sOldStatus) {
                    const bConfirmed = await this._confirmIrreversibleStatusChange(sNewStatus);
                    if (!bConfirmed) {
                        return; // user backed out, don't save anything
                    }
                }

                await this._saveEmployeeChanges(oEditData, oOriginal);
            },

            // Shows a warning MessageBox and resolves true/false based on the user's choice
            _confirmIrreversibleStatusChange: function (sNewStatus) {
                return new Promise((resolve) => {
                    MessageBox.warning(
                        `You are changing this employee's status to ${sNewStatus}. ` +
                        `This action cannot be undone. Do you want to continue?`,
                        {
                            title: "Confirm Status Change",
                            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                            emphasizedAction: MessageBox.Action.NO,
                            onClose: (sAction) => resolve(sAction === MessageBox.Action.YES)
                        }
                    );
                });
            },

            // The original save logic, unchanged, just extracted so it can be
            // called only after any required confirmation has passed.
            _saveEmployeeChanges: async function (oEditData, oOriginal) {
                const oContext = this.getView().getBindingContext();
                const oModel = this.getView().getModel();

                try {
                    let bChanged = false;
                    const aFields = [
                        "NAME",
                        "EMAIL",
                        "GENDER",
                        "PHONE_NUMBER",
                        "DATE_OF_BIRTH",
                        "JOINING_DATE",
                        "EXPERIENCE",
                        "STATUS"
                    ];
                    aFields.forEach((sField) => {
                        const vOld = String(oOriginal[sField] ?? "");
                        const vNew = String(oEditData[sField] ?? "");
                        if (vOld !== vNew) {
                            oContext.setProperty(sField, oEditData[sField]);
                            bChanged = true;
                        }
                    });

                    // Handle Designation
                    if (oOriginal.designation_ID !== oEditData.designation_ID) {
                        oContext.setProperty("designation_ID", oEditData.designation_ID);
                        bChanged = true;
                    }

                    if (!bChanged) {
                        MessageToast.show("No changes to save.");
                        this._oEditDialog.close();
                        return;
                    }

                    await oModel.submitBatch("$auto");

                    // Check if the PATCH operation failed
                    const aMessages = sap.ui.getCore()
                        .getMessageManager()
                        .getMessageModel()
                        .getData();
                    const oError = aMessages.find(m => m.type === "Error");

                    sap.ui.getCore().getEventBus().publish("Employees", "Refresh");
                    sap.ui.getCore().getEventBus().publish("Spof", "Refresh");
                    this.getView().getBindingContext().refresh();

                    if (oError) {
                        MessageBox.error(oError.message);
                        return;
                    }

                    MessageToast.show("Employee updated successfully.");
                    this._oEditDialog.close();
                } catch (e) {
                    console.error(e);
                    MessageBox.error(e.message || "Unable to update employee.");
                }
            },

            //Cancel Employee Edit
            onCancelEmployee: function () {
                this._oOriginalEmployee = null;
                this._oEditDialog.close();
            },

            //Edit Employee Skill
            onEditEmployeeSkill: async function (oEvent) {
                if (!this._oEditSkillDialog) {
                    this._oEditSkillDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.EditEmployeeSkill",
                        controller: this
                    });
                    this.getView().addDependent(this._oEditSkillDialog);
                }
                const oSkill = structuredClone(
                    oEvent.getSource()
                        .getBindingContext()
                        .getObject()
                );
                this._oSkillContext = oEvent.getSource().getBindingContext();
                this._oEditSkillDialog.setModel(
                    new sap.ui.model.json.JSONModel(oSkill),
                    "editSkill"
                );
                this._oEditSkillDialog.open();
            },

            //Update Employee Skill
            onUpdateEmployeeSkill: async function () {
                const oEditData = this._oEditSkillDialog
                    .getModel("editSkill")
                    .getData();
                try {
                    this._oSkillContext.setProperty(
                        "PROFICIENCY_LEVEL",
                        oEditData.PROFICIENCY_LEVEL
                    );
                    await this.getView()
                        .getModel()
                        .submitBatch("$auto");
                    MessageToast.show("Skill updated successfully.");
                    this._oEditSkillDialog.close();
                } catch (e) {
                    MessageBox.error(
                        e.message || "Unable to update skill."
                    );
                }
            },

            //Cancel Employee Skill Edit
            onCancelEmployeeSkill: function () {
                this._oEditSkillDialog.close();
            },

            //Delete Employee Skill
            onDeleteEmployeeSkill: async function (oEvent) {
                const oContext = oEvent.getSource().getBindingContext();
                if (!oContext) {
                    return;
                }
                const oModel = this.getView().getModel();
                try {
                    await sap.m.MessageBox.confirm(
                        "Are you sure you want to delete this skill?",
                        {
                            actions: [
                                sap.m.MessageBox.Action.YES,
                                sap.m.MessageBox.Action.NO
                            ],
                            emphasizedAction: sap.m.MessageBox.Action.YES,
                            onClose: async (sAction) => {
                                if (sAction !== sap.m.MessageBox.Action.YES) {
                                    return;
                                }
                                try {
                                    await oContext.delete("$auto");
                                    sap.m.MessageToast.show(
                                        "Employee skill deleted successfully."
                                    );
                                    this.getView().getBindingContext().refresh();
                                } catch (e) {
                                    sap.m.MessageBox.error(
                                        e.message || "Failed to delete employee skill."
                                    );
                                }
                            }
                        }
                    );
                } catch (e) {
                    sap.m.MessageBox.error(
                        e.message || "Failed to delete employee skill."
                    );
                }
            },
            _clearEmployeeSkillForm: function () {

                const oSkillCombo = this.byId("employeeSkillCombo");
                const oLevel = this.byId("addproficiencyLevel");

                if (oSkillCombo) {
                    oSkillCombo.setSelectedKey("");
                    oSkillCombo.setValue("");
                }

                if (oLevel) {
                    oLevel.setSelectedKey("BEGINNER");
                }
            },
            //Edit Feilds Validation
            onEditFieldChange: function (oEvent) {

                const oField = oEvent.getSource();
                const sId = oField.getId();

                oField.setValueState("None");
                oField.setValueStateText("");

                switch (true) {

                    case sId.includes("editName"):
                        if (!oField.getValue().trim()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Name is required");
                        }
                        break;

                    case sId.includes("editEmail"):
                        const sEmail = oField.getValue().trim();

                        if (!sEmail) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Email is required");
                        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Enter a valid email");
                        }
                        break;

                    case sId.includes("editPhone"):
                        const sPhone = oField.getValue().trim();

                        if (!sPhone) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Phone number is required");
                        } else if (!/^\d{10}$/.test(sPhone)) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Enter a valid 10-digit phone number");
                        }
                        break;

                    case sId.includes("editExperience"):
                        const fExp = parseFloat(oField.getValue());

                        if (isNaN(fExp) || fExp < 0) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Invalid experience");
                        }
                        break;

                    case sId.includes("editGender"):
                        if (!oField.getSelectedKey()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Please select gender");
                        }
                        break;

                    case sId.includes("editStatus"):
                        if (!oField.getSelectedKey()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Please select status");
                        }
                        break;

                    case sId.includes("editDesignation"):
                        if (!oField.getSelectedKey()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Please select designation");
                        }
                        break;

                    case sId.includes("editDob"):
                        if (!oField.getDateValue()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Date of Birth is required");
                        }
                        break;

                    case sId.includes("editJoiningDate"):
                        if (!oField.getDateValue()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Joining Date is required");
                        }
                        break;
                }
            },
            // Validate Edit Employee Form
            _validateEditEmployeeForm: function () {
                let bValid = true;

                const aFields = [
                    this.byId("editName"),
                    this.byId("editEmail"),
                    this.byId("editPhone"),
                    this.byId("editDob"),
                    this.byId("editJoiningDate"),
                    this.byId("editExperience")
                ];

                aFields.forEach((oField) => {
                    let bFieldValid = true;
                    let sErrorText = "Required";

                    if (oField.getValue) {

                        const sValue = oField.getValue().trim();

                        if (!sValue) {
                            bFieldValid = false;
                        }

                        // Email
                        else if (oField.getId().includes("editEmail") &&
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sValue)) {

                            bFieldValid = false;
                            sErrorText = "Enter a valid email";
                        }

                        // Phone
                        else if (oField.getId().includes("editPhone") &&
                            !/^\d{10}$/.test(sValue)) {

                            bFieldValid = false;
                            sErrorText = "Enter a valid 10-digit phone number";
                        }

                        // Experience
                        else if (oField.getId().includes("editExperience")) {

                            const fExp = parseFloat(sValue);

                            if (isNaN(fExp) || fExp < 0) {
                                bFieldValid = false;
                                sErrorText = "Invalid experience";
                            }
                        }

                    } else if (oField.getDateValue) {

                        if (!oField.getDateValue()) {
                            bFieldValid = false;
                        }

                    }

                    if (!bFieldValid) {
                        oField.setValueState("Error");
                        oField.setValueStateText(sErrorText);
                        bValid = false;
                    } else {
                        oField.setValueState("None");
                        oField.setValueStateText("");
                    }
                });

                // Gender
                const oGender = this.byId("editGender");

                if (!oGender.getSelectedKey()) {
                    oGender.setValueState("Error");
                    oGender.setValueStateText("Please select gender");
                    bValid = false;
                } else {
                    oGender.setValueState("None");
                    oGender.setValueStateText("");
                }

                // Status
                const oStatus = this.byId("editStatus");

                if (!oStatus.getSelectedKey()) {
                    oStatus.setValueState("Error");
                    oStatus.setValueStateText("Please select status");
                    bValid = false;
                } else {
                    oStatus.setValueState("None");
                    oStatus.setValueStateText("");
                }

                // Designation
                const oDesignation = this.byId("editDesignation");

                if (!oDesignation.getSelectedKey()) {
                    oDesignation.setValueState("Error");
                    oDesignation.setValueStateText("Please select designation");
                    bValid = false;
                } else {
                    oDesignation.setValueState("None");
                    oDesignation.setValueStateText("");
                }

                return bValid;
            },

        }
    );
});