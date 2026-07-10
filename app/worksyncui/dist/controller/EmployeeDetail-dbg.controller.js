sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/f/LayoutType"
], function (Controller, History, MessageToast, Fragment, LayoutType) {
    "use strict";

    return Controller.extend(
        "com.amista.worksyncui.controller.EmployeeDetail",
        {
            onInit: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("employeeDetail")
                    .attachPatternMatched(this._onObjectMatched, this);
            },

            // Helper: get the FCL control from App view
            _getFCL: function () {
                // Try via Component root control first
                try {
                    const oRootView = this.getOwnerComponent().getRootControl();
                    if (oRootView) {
                        const oFCL = oRootView.byId("fcl");
                        if (oFCL) return oFCL;
                    }
                } catch (e) { /* ignore */ }

                // Fallback: find FCL by ID in Core
                try {
                    const sAppId   = this.getOwnerComponent().getId();
                    const oFCL     = sap.ui.getCore().byId(sAppId + "---App--fcl");
                    if (oFCL) return oFCL;
                } catch (e) { /* ignore */ }

                // Last resort: search all controls
                try {
                    const oFCL = sap.ui.getCore().byId("App--fcl");
                    if (oFCL) return oFCL;
                } catch (e) { /* ignore */ }

                console.warn("FCL not found");
                return null;
            },

            _onObjectMatched: function (oEvent) {
                const sEmployeeId = oEvent.getParameter("arguments").employeeId;

                // Switch FCL to two-column layout so mid column becomes visible
                const oFCL = this._getFCL();
                if (oFCL) {
                    oFCL.setLayout(LayoutType.TwoColumnsMidExpanded);
                }

                // Bind view to the employee record
                this.getView().bindElement({
                    path: "/EMPLOYEES(" + sEmployeeId + ")",
                    parameters: {
                        $expand: "DESIGNATION,skills($expand=skill),allocations($expand=project)"
                    },
                    events: {
                        dataReceived: function (oData) {
                            if (!oData.getParameter("data")) {
                                MessageToast.show("Employee not found");
                            }
                        }
                    }
                });
            },

            onNavBack: function () {
                // Collapse FCL back to one column
                const oFCL = this._getFCL();
                if (oFCL) {
                    oFCL.setLayout(LayoutType.OneColumn);
                }

                const sPreviousHash = History.getInstance().getPreviousHash();
                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    this.getOwnerComponent().getRouter().navTo("Admin");
                }
            },

            onEditEmployee: function () {
                MessageToast.show("Edit Employee Coming Soon");
            },

            onDeactivateEmployee: function () {
                MessageToast.show("Deactivate Employee Coming Soon");
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
                try {
                    const oModel      = this.getView().getModel();
                    const sEmployeeId = this.getView().getBindingContext().getProperty("ID");
                    const sSkillId    = this.byId("employeeSkillCombo").getSelectedKey();
                    const iLevel      = this.byId("employeeSkillLevel").getValue();

                    if (!sSkillId) {
                        MessageToast.show("Please select a skill");
                        return;
                    }

                    const oContext = oModel.bindList("/EMPLOYEE_SKILLS").create({
                        employee_ID:       sEmployeeId,
                        skill_ID:          sSkillId,
                        PROFICIENCY_LEVEL: parseInt(iLevel) || 1
                    });

                    await oContext.created();
                    MessageToast.show("Skill Added Successfully");
                    this._oEmployeeSkillDialog.close();
                    //this.getView().getElementBinding().refresh();

                } catch (oError) {
                    console.error(oError);
                    MessageToast.show(oError.message || "Failed to Add Skill");
                }
            }
        }
    );
});