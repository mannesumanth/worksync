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
                if (oFCL) oFCL.setLayout(LayoutType.TwoColumnsMidExpanded);
                this.getView().bindElement({
                    path: "/EMPLOYEES(" + sEmployeeId + ")",
                    parameters: { $expand: "designation,skills($expand=skill),allocations($expand=project)" }
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
                const iLevel = parseInt(
                    this.byId("proficiencyLevel").getSelectedKey(),
                    10
                );
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
                        PROFICIENCY_LEVEL: iLevel
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

                this._oEditDialog.setBindingContext(
                    this.getView().getBindingContext()
                );

                this._oEditDialog.open();
            },
            onUpdateEmployee: async function () {

                const oModel = this.getView().getModel();

                try {

                    // Check for pending changes
                    if (!oModel.hasPendingChanges()) {
                        MessageToast.show("No changes to save.");
                        this._oEditDialog.close();
                        return;
                    }

                    await oModel.submitBatch("$auto");

                    MessageToast.show("Employee updated successfully.");

                    this._oEditDialog.close();

                    // Refresh the employee details page
                    this.getView().getBindingContext().refresh();

                } catch (oError) {

                    console.error(oError);

                    MessageBox.error(
                        "Unable to update employee.\n\n" +
                        (oError.message || "Unknown error")
                    );
                }
            },
            onCancelEmployee: function () {
                const oModel = this.getView().getModel();
                if (oModel.hasPendingChanges()) {
                    oModel.resetChanges();
                }
                this._oEditDialog.close();
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