
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
        "com.amista.worksyncui.controller.Employees",
        {
            onInit: function () {
                this._loadDesignations();
                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("Admin")          // the route name for this Employees list view
                    .attachPatternMatched(this._onEmployeesRouteMatched, this);
                sap.ui.getCore().getEventBus().subscribe(
                    "Designations",
                    "Refresh",
                    this._loadDesignations,
                    this
                );

            }, _onEmployeesRouteMatched: function () {
                this._loadDesignations();

                const oTable = this.byId("employeesTable");
                const oBinding = oTable && oTable.getBinding("items");

                if (oBinding) {
                    oBinding.refresh();
                }
            },

            onExit: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("Admin")
                    .detachPatternMatched(this._onEmployeesRouteMatched, this);
            },
            formatProfilePhoto: function (sEmployeeId) {

    if (!sEmployeeId) {
        return "";
    }

    const oModel = this.getOwnerComponent().getModel();
    const sServiceUrl = oModel.getServiceUrl();

    return sServiceUrl +
        "EMPLOYEES(" +
        sEmployeeId +
        ")/PROFILE_PHOTO";
},
            onProfileImageError: function (oEvent) {

                const oImage = oEvent.getSource();
                const oHBox = oImage.getParent();

                oImage.setVisible(false);

                const oIcon = oHBox.getItems()[1];

                if (oIcon) {
                    oIcon.setVisible(true);
                }
            },

            //Load Designations
            async _loadDesignations() {
                const oModel = this.getOwnerComponent().getModel();

                const oBinding = oModel.bindList("/DESIGNATIONS");
                const aContexts = await oBinding.requestContexts(0, 100);

                // Sort designations alphabetically
                const aDesignationData = aContexts
                    .map(oContext => oContext.getObject())
                    .sort((a, b) => a.NAME.localeCompare(b.NAME));

                // Add "All Designations" at the beginning
                const aDesignations = [
                    {
                        ID: "",
                        NAME: "All Designations"
                    },
                    ...aDesignationData
                ];

                this.getView().setModel(
                    new sap.ui.model.json.JSONModel({
                        designations: aDesignations
                    }),
                    "designationModel"
                );
                // Model for Add/Edit Employee
                this.getView().setModel(
                    new JSONModel({
                        designations: aDesignationData
                    }),
                    "designationModelED"
                );
            },

            //Add Employee Dialog
            onAddEmployee: async function () {
                await this._loadDesignations();
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

            //Save Employee
            onSaveEmployee: async function () {
                if (!this._validateEmployeeForm()) {
                    MessageToast.show("Please fill all required fields");
                    return;
                }
                const oModel = this.getView().getModel();
                //Create Payload
                const oPayload = {
                    NAME: this.byId("empName").getValue(),
                    EMAIL: this.byId("empEmail").getValue(),
                    PHONE_NUMBER: this.byId("empPhone").getValue(),
                    GENDER: this.byId("empGender").getSelectedKey(),
                    DATE_OF_BIRTH: this.byId("empDob").getDateValue()?.toISOString().split("T")[0],
                    JOINING_DATE: this.byId("empJoiningDate").getDateValue()?.toISOString().split("T")[0],
                    EXPERIENCE: parseFloat(this.byId("empExperience").getValue()),
                    STATUS: this.byId("empStatus").getSelectedKey(),
                    designation_ID: this.byId("empDesignation").getSelectedKey()
                };

                // Show busy indicator immediately
                this._oEmployeeDialog.setBusyIndicatorDelay(0);
                this._oEmployeeDialog.setBusy(true);
                try {
                    const oEmpCtx = oModel.bindList("/EMPLOYEES").create(oPayload);
                    await oEmpCtx.created();
                    const oTable1 = this.byId("employeesTable");
                    oTable1.getBinding("items").refresh();
                    const sEmpId = oEmpCtx.getProperty("ID");
                    //await this._loadEmployees(); // Refresh the employee list after creation
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

            //Cancel Employee Dialog
            onCancelEmployee: function () {
                this._oEmployeeDialog.close();
                this._clearEmployeeForm();
            },

            //Clear Employee Form
            _clearEmployeeForm: function () {
                ["empName", "empEmail", "empPhone", "empExperience", "empGender", "empDob", "empJoiningDate"].forEach(id => {
                    this.byId(id)?.setValue("");
                });
                this.byId("empStatus")?.setSelectedKey("SELECT");
                this.byId("empSkills")?.setSelectedKeys([]);
                [
                    "empName",
                    "empEmail",
                    "empPhone",
                    "empDob",
                    "empGender",
                    "empJoiningDate",
                    "empExperience",
                    "empStatus",
                    "empDesignation"
                ].forEach(sId => {
                    const oControl = this.byId(sId);

                    if (oControl && oControl.setValueState) {
                        oControl.setValueState("None");
                        oControl.setValueStateText("");
                    }
                });
            },

            //View Employee Details
            onViewEmployee: function (oEvent) {

                const oContext = oEvent.getSource().getBindingContext();
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

            onEmployeeFilterChange: function () {
                const oTable = this.byId("employeesTable");
                const oBinding = oTable.getBinding("items");

                // Guard against binding not being ready yet
                if (!oBinding) {
                    return;
                }

                const sSearch = this.byId("employeeSearch").getValue().trim();
                const sStatus = this.byId("statusFilter1").getSelectedKey();
                const sDesignation = this.byId("designationFilter").getSelectedKey();
                const sMinExp = this.byId("experienceFilter").getValue().trim();
                const sMaxExp = this.byId("maxExperienceFilter").getValue().trim();

                const aFilters = [];

                // EMP_ID OR NAME OR EMAIL
                if (sSearch) {
                    aFilters.push(
                        new Filter({
                            filters: [
                                new Filter("EMP_ID", FilterOperator.Contains, sSearch),
                                new Filter("NAME", FilterOperator.Contains, sSearch),
                                new Filter("EMAIL", FilterOperator.Contains, sSearch)
                            ],
                            and: false
                        })
                    );
                }

                // Status
                if (sStatus) {
                    aFilters.push(new Filter("STATUS", FilterOperator.EQ, sStatus));
                }

                // Designation
                if (sDesignation) {
                    aFilters.push(new Filter("designation_ID", FilterOperator.EQ, sDesignation));
                }

                const fMinExp = sMinExp !== "" ? parseFloat(sMinExp) : null;
                const fMaxExp = sMaxExp !== "" ? parseFloat(sMaxExp) : null;

                // Min + Max
                if (fMinExp !== null && !isNaN(fMinExp) && fMaxExp !== null && !isNaN(fMaxExp)) {
                    if (fMinExp <= fMaxExp) {
                        aFilters.push(new Filter("EXPERIENCE", FilterOperator.GE, fMinExp));
                        aFilters.push(new Filter("EXPERIENCE", FilterOperator.LE, fMaxExp));
                    } else {
                        sap.m.MessageToast.show(
                            "Minimum experience cannot be greater than maximum experience."
                        );
                        return;
                    }
                }
                // Only Min
                else if (fMinExp !== null && !isNaN(fMinExp)) {
                    aFilters.push(new Filter("EXPERIENCE", FilterOperator.GE, fMinExp));
                }
                // Only Max
                else if (fMaxExp !== null && !isNaN(fMaxExp)) {
                    aFilters.push(new Filter("EXPERIENCE", FilterOperator.LE, fMaxExp));
                }

                // Apply all filters
                oBinding.filter(aFilters);
            },
            //Clear filters
            onClearFilters: function () {
                const oTable = this.byId("employeesTable");
                const oBinding = oTable.getBinding("items");

                // Reset all filter controls
                this.byId("employeeSearch").setValue("");
                this.byId("statusFilter1").setSelectedKey("");
                this.byId("designationFilter").setSelectedKey("");
                this.byId("experienceFilter").setValue("");
                this.byId("maxExperienceFilter").setValue("");

                // Clear the binding filter
                if (oBinding) {
                    oBinding.filter([]);
                }
            },
            // Validate Employee Form
            _validateEmployeeForm: function () {
                let bValid = true;

                const aFields = [
                    this.byId("empName"),
                    this.byId("empEmail"),
                    this.byId("empPhone"),
                    this.byId("empDob"),
                    this.byId("empJoiningDate"),
                    this.byId("empExperience")
                ];

                aFields.forEach(oField => {
                    const sId = oField.getId();
                    let bFieldValid = true;
                    let sErrorText = "Required";

                    if (oField.getValue) {
                        const sValue = oField.getValue().trim();
                        if (!sValue) {
                            bFieldValid = false;
                        }
                        // Email
                        else if (sId.includes("empEmail") &&
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sValue)) {
                            bFieldValid = false;
                            sErrorText = "Enter a valid email";
                        }

                        // Phone
                        else if (sId.includes("empPhone") &&
                            !/^\d{10}$/.test(sValue)) {
                            bFieldValid = false;
                            sErrorText = "Enter a valid 10-digit phone number";
                        }
                        // Experience
                        else if (sId.includes("empExperience")) {
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
                const oGender = this.byId("empGender");
                if (!oGender.getSelectedKey()) {
                    oGender.setValueState("Error");
                    oGender.setValueStateText("Please select gender");
                    bValid = false;
                } else {
                    oGender.setValueState("None");
                    oGender.setValueStateText("");
                }
                // Status
                const oStatus = this.byId("empStatus");
                if (oStatus.getSelectedKey() === "SELECT") {
                    oStatus.setValueState("Error");
                    oStatus.setValueStateText("Please select status");
                    bValid = false;
                } else {
                    oStatus.setValueState("None");
                    oStatus.setValueStateText("");
                }
                // Designation
                const oDesignation = this.byId("empDesignation");
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
            // Live Validation
            onFieldChange: function (oEvent) {
                const oField = oEvent.getSource();
                const sId = oField.getId();
                oField.setValueState("None");
                oField.setValueStateText("");
                switch (true) {
                    // Employee Name
                    case sId.includes("empName"):
                        if (!oField.getValue().trim()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Name is required");
                        }
                        break;
                    // Email
                    case sId.includes("empEmail"):
                        const sEmail = oField.getValue().trim();
                        if (!sEmail) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Email is required");
                        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Enter a valid email");
                        }
                        break;
                    // Phone
                    case sId.includes("empPhone"):
                        const sPhone = oField.getValue().trim();
                        if (!sPhone) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Phone number is required");
                        } else if (!/^\d{10}$/.test(sPhone)) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Enter a valid 10-digit phone number");
                        }
                        break;
                    // Experience
                    case sId.includes("empExperience"):
                        const sExp = oField.getValue().trim();
                        const fExp = parseFloat(sExp);
                        if (!sExp) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Experience is required");
                        } else if (isNaN(fExp) || fExp < 0) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Invalid experience");
                        }
                        break;
                    // Gender
                    case sId.includes("empGender"):
                        if (!oField.getSelectedKey()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Please select gender");
                        }
                        break;
                    // Status
                    case sId.includes("empStatus"):
                        if (oField.getSelectedKey() === "SELECT") {
                            oField.setValueState("Error");
                            oField.setValueStateText("Please select status");
                        }
                        break;
                    // Designation
                    case sId.includes("empDesignation"):
                        if (!oField.getSelectedKey()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Please select designation");
                        }
                        break;
                    // Date of Birth
                    case sId.includes("empDob"):
                        if (!oField.getDateValue()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Date of Birth is required");
                        }
                        break;
                    // Joining Date
                    case sId.includes("empJoiningDate"):
                        if (!oField.getDateValue()) {
                            oField.setValueState("Error");
                            oField.setValueStateText("Joining Date is required");
                        }
                        break;
                }
            }
        });
});