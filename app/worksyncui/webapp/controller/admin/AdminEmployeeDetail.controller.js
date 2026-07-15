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
        "com.amista.worksyncui.controller.admin.AdminEmployeeDetail",
        {

            onInit: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("AdminEmployeeDetail")
                    .attachPatternMatched(
                        this._onObjectMatched,
                        this
                    );
            },

            _getFCL: function () {
                return this.getOwnerComponent()
                    .getRootControl()
                    .byId("fcl");
            },

            _onObjectMatched: function (oEvent) {
                const sEmployeeId = oEvent.getParameter("arguments").employeeId;

                const oFCL = this._getFCL();
                if (oFCL) {
                    oFCL.setLayout(LayoutType.TwoColumnsMidExpanded);
                }

                this.getView().bindElement({
                    path: "/EMPLOYEES('" + sEmployeeId + "')",
                    parameters: {
                        $expand: "designation,skills($expand=skill),allocations($expand=project)"
                    },
                    events: {
                        dataRequested: function () {
                            console.log("Loading employee...");
                        },
                        dataReceived: function (oEvent) {
                            console.log("Employee loaded", oEvent);
                        }
                    }
                });
            },

            onNavBack: function () {
                const oFCL = this._getFCL();
                if (oFCL) oFCL.setLayout(LayoutType.OneColumn);
                this.getOwnerComponent().getRouter().navTo("Admin");
            },

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
            onCloseEmployeeSkill: function () {
                this._oEmployeeSkillDialog.close();

            },
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
                    this._oEmployeeSkillDialog.close();
                } catch (e) {
                    MessageBox.error(e.message);
                }
            },

            onEditEmployee: async function () {

                if (!this._oEditDialog) {

                    this._oEditDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.EditEmployee",
                        controller: this
                    });

                    this.getView().addDependent(this._oEditDialog);
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
            onUpdateEmployee: async function () {

                const oContext = this.getView().getBindingContext();
                const oModel = this.getView().getModel();

                const oEditData = this._oEditDialog
                    .getModel("edit")
                    .getData();

                const oOriginal = this._oOriginalEmployee;

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
                        "ROLE",
                        "STATUS"
                    ];

                    aFields.forEach((sField) => {

                        const vOld = String(oOriginal[sField] ?? "");
                        const vNew = String(oEditData[sField] ?? "");

                        if (vOld !== vNew) {

                            oContext.setProperty(
                                sField,
                                oEditData[sField]
                            );

                            bChanged = true;
                        }

                    });

                    // Handle Designation separately
                    if (oOriginal.designation_ID !== oEditData.designation_ID) {

                        oContext.setProperty(
                            "designation_ID",
                            oEditData.designation_ID
                        );

                        bChanged = true;
                    }

                    if (!bChanged) {

                        MessageToast.show("No changes to save.");

                        this._oEditDialog.close();

                        return;
                    }

                    await oModel.submitBatch("$auto");

                    MessageToast.show("Employee updated successfully.");

                    this.getView()
                        .getBindingContext()
                        .refresh();

                    this._oEditDialog.close();

                } catch (e) {

                    console.error(e);

                    MessageBox.error(
                        e.message || "Unable to update employee."
                    );

                }

            },
            onCancelEmployee: function () {

                this._oOriginalEmployee = null;

                this._oEditDialog.close();

            },
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
            onCancelEmployeeSkill: function () {

                this._oEditSkillDialog.close();

            },
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

        }
    );
});