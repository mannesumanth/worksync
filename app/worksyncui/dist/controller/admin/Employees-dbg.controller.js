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
            onAddEmployee: async function () {
                if (!this._oEmployeeDialog) {
                    this._oEmployeeDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "com.amista.worksyncui.view.fragments.AddEmployee",
                        controller: this
                    });
                    this.getView().addDependent(this._oEmployeeDialog);
                }
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
                    DATE_OF_BIRTH: this.byId("empDob").getDateValue()?.toISOString().split("T")[0],
                    JOINING_DATE: this.byId("empJoiningDate").getDateValue()?.toISOString().split("T")[0],
                    EXPERIENCE: parseFloat(this.byId("empExperience").getValue()),
                    ROLE: this.byId("empRole").getSelectedKey(),
                    STATUS: this.byId("empStatus").getSelectedKey(),
                    designation_ID: this.byId("empDesignation").getSelectedKey()
                };
                try {
                    const oEmpCtx = oModel.bindList("/EMPLOYEES").create(oPayload);
                    await oEmpCtx.created();
                    const sEmpId = oEmpCtx.getProperty("ID");
                    const aSkills = this.byId("empSkills").getSelectedKeys();
                    for (const sSkillId of aSkills) {
                        const oSkCtx = oModel.bindList("/EMPLOYEE_SKILLS").create({
                            employee_ID: sEmpId, skill_ID: sSkillId, PROFICIENCY_LEVEL: 1
                        });
                        await oSkCtx.created();
                    }

                    MessageToast.show("Employee Created Successfully");
                    this.byId("employeesTable")?.getBinding("items")?.refresh();
                    //this._loadEmployeeSkills();
                    this._oEmployeeDialog.close();
                    this._clearEmployeeForm();
                } catch (e) {
                    console.error(e);
                    MessageBox.error(e.message || "Employee Creation Failed");
                }
            },

            onCancelEmployee: function () {
                this._oEmployeeDialog.close();
                this._clearEmployeeForm();
            },

            _validateEmployeeForm: function () {
                let bValid = true;
                [
                    this.byId("empName"), this.byId("empEmail"), this.byId("empPhone"),
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
                ["empName", "empEmail", "empPhone", "empExperience"].forEach(id => {
                    this.byId(id)?.setValue("");
                });
                this.byId("empSkills")?.setSelectedKeys([]);
            },
            onViewEmployee: function (oEvent) {
                const sEmployeeId =
                    oEvent.getSource()
                        .getBindingContext()
                        .getProperty("ID");

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "AdminEmployeeDetail",
                        {
                            employeeId: sEmployeeId
                        }
                    );
            },

            // EMPLOYEE SEARCH

            onEmployeeFilterChange: async function () {
                try {
                    const sSearch = this.byId("employeeSearch").getValue();
                    const sStatus = this.byId("statusFilter1").getSelectedKey();
                    const fMinExp =
                        parseFloat(
                            this.byId("experienceFilter")
                                .getValue()
                        ) || 0;
                    const oAction = this.getView().getModel().bindContext("/SearchEmployees(...)");
                    oAction.setParameter("search", sSearch);
                    oAction.setParameter("status", sStatus);
                    oAction.setParameter("minExp", fMinExp);
                    oAction.setParameter("skip", 0);
                    oAction.setParameter("top", 100);
                    await oAction.execute();
                    const aEmployees = oAction.getBoundContext().getObject().value || [];
                    const oTable = this.byId("employeesTable");
                    const oBinding = oTable.getBinding("items");
                    this.getView().setModel(
                        new JSONModel({
                            EMPLOYEES: aEmployees
                        }),
                        "search"
                    );
                    if (!aEmployees.length) {
                        oBinding.filter();
                        MessageToast.show("No employees found");
                        return;
                    }
                    const aFilters = aEmployees.map(oEmp =>
                        new Filter(
                            "ID",
                            FilterOperator.EQ,
                            oEmp.ID
                        )
                    );
                    oBinding.filter([
                        new Filter({
                            filters: aFilters,
                            and: false
                        })
                    ]);
                } catch (e) {
                    console.error(e);
                }
            }

        }
    );
});