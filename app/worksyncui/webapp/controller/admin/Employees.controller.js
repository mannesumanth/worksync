
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (
    Controller,
    Fragment,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator,
    JSONModel
) {
    "use strict";

    return Controller.extend(
        "com.amista.worksyncui.controller.admin.Employees",
        {
            onInit: async function () {
                this.getOwnerComponent().setModel(
                    new JSONModel({
                        EMPLOYEES: []
                    }),
                    "table"
                );
                this._loadDesignations();
                this._loadEmployees();

            },
            _loadEmployees: async function () {

                const oBinding = this.getOwnerComponent()
                    .getModel()
                    .bindList("/EMPLOYEES", undefined, undefined, undefined, {
                        $expand: "designation"
                    });

                const aContexts = await oBinding.requestContexts(0, 100);

                const aEmployees = aContexts.map(oContext => oContext.getObject());

                this.getOwnerComponent()
                    .getModel("table")
                    .setProperty("/EMPLOYEES", aEmployees);
                console.log(
                    this.getOwnerComponent().getModel("table").getData()
                );
            },
            async _loadDesignations() {
                const oModel = this.getOwnerComponent().getModel();

                const oBinding = oModel.bindList("/DESIGNATIONS");
                const aContexts = await oBinding.requestContexts(0, 100);

                const aDesignations = [{
                    ID: "",
                    NAME: "All Designations"
                }];

                aContexts.forEach(oContext => {
                    aDesignations.push(oContext.getObject());
                });

                this.getView().setModel(
                    new sap.ui.model.json.JSONModel({
                        designations: aDesignations
                    }),
                    "designationModel"
                );
            },
            onAddEmployee: async function () {
                if (!this._oEmployeeDialog) {
                    this._oEmployeeDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.AddEmployee",
                        controller: this
                    });
                    this.getView().addDependent(this._oEmployeeDialog);
                }
                this._clearEmployeeForm();
                this._oEmployeeDialog.open();
            },
            onSaveEmployee: async function () {

                if (!this._validateEmployeeForm()) {
                    MessageToast.show("Please fill all required fields");
                    return;
                }

                const oModel = this.getView().getModel();

                const oPayload = {
                    NAME: this.byId("empName").getValue(),
                    EMAIL: this.byId("empEmail").getValue(),
                    PHONE_NUMBER: this.byId("empPhone").getValue(),
                    GENDER: this.byId("empGender").getSelectedKey(),
                    DATE_OF_BIRTH: this.byId("empDob").getDateValue()?.toISOString().split("T")[0],
                    JOINING_DATE: this.byId("empJoiningDate").getDateValue()?.toISOString().split("T")[0],
                    EXPERIENCE: parseFloat(this.byId("empExperience").getValue()),
                    ROLE: this.byId("empRole").getSelectedKey(),
                    STATUS: this.byId("empStatus").getSelectedKey(),
                    designation_ID: this.byId("empDesignation").getSelectedKey()
                };

                // Show busy indicator immediately
                this._oEmployeeDialog.setBusyIndicatorDelay(0);
                this._oEmployeeDialog.setBusy(true);

                try {

                    const oEmpCtx = oModel.bindList("/EMPLOYEES").create(oPayload);
                    await oEmpCtx.created();

                    const sEmpId = oEmpCtx.getProperty("ID");

                    const aSkills = this.byId("empSkills").getSelectedKeys();

                    for (const sSkillId of aSkills) {
                        const oSkCtx = oModel.bindList("/EMPLOYEE_SKILLS").create({
                            employee_ID: sEmpId,
                            skill_ID: sSkillId,
                            PROFICIENCY_LEVEL: 1
                        });

                        await oSkCtx.created();
                    }

                    await this._loadEmployees();

                    MessageToast.show("Employee Created Successfully");

                    this._oEmployeeDialog.close();
                    this._clearEmployeeForm();

                } catch (e) {

                    console.error(e);
                    MessageBox.error(e.message || "Employee Creation Failed");

                } finally {

                    // Always remove busy indicator
                    this._oEmployeeDialog.setBusy(false);

                }
            },

            onCancelEmployee: function () {
                this._oEmployeeDialog.close();
                this._clearEmployeeForm();
            },

            _validateEmployeeForm: function () {
                let bValid = true;
                [
                    this.byId("empName"), this.byId("empEmail"), this.byId("empPhone"), this.byId("empGender"),
                    this.byId("empDob"), this.byId("empJoiningDate"),
                    this.byId("empExperience"), this.byId("empDesignation")
                ].forEach(oField => {
                    const sVal = oField.getValue
                        ? oField.getValue()
                        : (oField.getSelectedKey ? oField.getSelectedKey() : "");
                    if (!sVal) {
                        oField.setValueState("Error");
                        oField.setValueStateText("Required");
                        bValid = false;
                    } else {
                        oField.setValueState("None");
                    }
                });
                return bValid;
            },

            _clearEmployeeForm: function () {
                ["empName", "empEmail", "empPhone", "empExperience", "empGender", "empDob", "empJoiningDate"].forEach(id => {
                    this.byId(id)?.setValue("");
                });
                this.byId("empSkills")?.setSelectedKeys([]);
                [
                    "empName",
                    "empEmail",
                    "empPhone",
                    "empDob",
                    "empGender",
                    "empJoiningDate",
                    "empExperience",
                    "empRole",
                    "empStatus",
                    "empDesignation",
                    "empSkills"
                ].forEach(sId => {
                    const oControl = this.byId(sId);

                    if (oControl && oControl.setValueState) {
                        oControl.setValueState("None");
                        oControl.setValueStateText("");
                    }
                });
            },
            onViewEmployee: function (oEvent) {
                const oContext = oEvent.getSource().getBindingContext("table");

                if (!oContext) {
                    sap.m.MessageToast.show("Unable to retrieve employee details.");
                    return;
                }

                const sEmployeeId = oContext.getProperty("ID");

                this.getOwnerComponent().getRouter().navTo("AdminEmployeeDetail", {
                    employeeId: sEmployeeId
                });
            },
            // EMPLOYEE SEARCH

            onEmployeeFilterChange: async function () {
                try {
                    const sSearch = this.byId("employeeSearch").getValue().trim();
                    const sStatus = this.byId("statusFilter1").getSelectedKey();
                    const sDesignation = this.byId("designationFilter").getSelectedKey();

                    const sMin = this.byId("experienceFilter").getValue();
                    const sMax = this.byId("maxExperienceFilter").getValue();

                    const fMin = sMin ? parseFloat(sMin) : null;
                    const fMax = sMax ? parseFloat(sMax) : null;
                    if (fMin !== null && fMax !== null && fMin > fMax) {
                        MessageBox.warning("Minimum experience cannot be greater than maximum experience."
                        );
                        return;
                    }

                    const bHasFilters =
                        sSearch ||
                        sStatus ||
                        sDesignation ||
                        sMin ||
                        sMax;

                    // No filters -> reload all employees
                    if (!bHasFilters) {
                        await this._loadEmployees();
                        return;
                    }

                    const oAction =
                        this.getView()
                            .getModel()
                            .bindContext("/SearchEmployees(...)");

                    oAction.setParameter("search", sSearch);
                    oAction.setParameter("status", sStatus);
                    oAction.setParameter("designation", sDesignation);
                    oAction.setParameter(
                        "minExp",
                        fMin ? parseFloat(sMin) : null
                    );
                    oAction.setParameter(
                        "maxExp",
                        fMax ? parseFloat(sMax) : null
                    );
                    oAction.setParameter("skip", 0);
                    oAction.setParameter("top", 100);

                    await oAction.execute();

                    const aEmployees =
                        oAction.getBoundContext().getObject().value || [];

                    this.getView()
                        .getModel("table")
                        .setProperty("/EMPLOYEES", aEmployees);

                    if (!aEmployees.length) {
                        MessageToast.show("No employees found");
                    }

                } catch (e) {
                    console.error(e);
                    MessageBox.error("Unable to search employees.");
                }
            },
            onClearFilters: async function () {

                this.byId("employeeSearch").setValue("");
                this.byId("designationFilter").setSelectedKey("");
                this.byId("statusFilter1").setSelectedKey("");
                this.byId("experienceFilter").setValue("");
                this.byId("maxExperienceFilter").setValue("");

                await this._loadEmployees();
            },
            onFieldChange: function (oEvent) {

                const oControl = oEvent.getSource();

                let bValid = false;

                if (oControl.getValue) {
                    bValid = oControl.getValue().trim() !== "";
                } else if (oControl.getSelectedKey) {
                    bValid = oControl.getSelectedKey() !== "";
                } else if (oControl.getDateValue) {
                    bValid = !!oControl.getDateValue();
                }

                if (bValid) {
                    oControl.setValueState("None");
                    oControl.setValueStateText("");
                } else {
                    oControl.setValueState("Error");
                    oControl.setValueStateText("Required");
                }
            }

        }
    );
});