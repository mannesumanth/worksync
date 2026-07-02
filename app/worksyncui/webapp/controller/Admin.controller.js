sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
], (Controller, Fragment, MessageToast, MessageBox, Filter, FilterOperator, JSONModel) => {
    "use strict";

    const NAV_PAGES = {
        dashboard: "dashboardPage",
        employees: "employeesPage",
        designations: "designationsPage",
        skillCategories: "skillCategoriesPage",
        skills: "adminskillsPage",
        projects: "adminprojectsPage",
        allocations: "allocationsPage",
        leave: "leavePage",
        backups: "backupsPage",
        risks: "risksPage",
        spof: "spofPage",
        forecast: "forecastPage"
    };

    return Controller.extend("com.amista.worksyncui.controller.Admin", {
        onInit: function () {
            this.getView().setModel(new JSONModel({ skills: [] }), "projectModel");
            this.getView().setModel(new JSONModel({ currentMonthAvailable: 0, nextMonthAvailable: 0, currentMonthLeaves: 0, nextMonthLeaves: 0, pendingLeaves: 0 }), "forecast");
            this.getView().setModel(new JSONModel({
                empCount: 0,
                projCount: 0,
                allocCount: 0,
                leaveCount: 0,
                skillCount: 0,
                spofCount: 0,
                spofPercent: 0,
                leavePending: 0,
                leaveApproved: 0,
                leaveRejected: 0
            }), "dash");

            this._searchValue = "";
            this._statusValue = "";
            this._allocationValue = "";
            this.getView().setModel(
                new JSONModel({
                    value: []
                }),
                "forecast"
            );
            this.getView().setModel(
                new JSONModel({
                    available: 0,
                    bench: 0,
                    leave: 0,
                    utilization: 0,
                    employeeCount: 0
                }),
                "summary"
            );

            // Load counts after OData model is ready
            const oModel = this.getView().getModel();
            if (oModel) {
                oModel.attachEventOnce("requestCompleted", () => {
                    this._loadDashboardCounts();
                    this._loadLeaveBreakdown();
                    //this._loadEmployeeSkills();
                    this._loadAvailabilityForecast();

                });
            }
            // Fallback for cds watch local dev
            setTimeout(() => {
                this._loadDashboardCounts();
                this._loadLeaveBreakdown();
                //this._loadEmployeeSkills();
                this.onLoadSpofRisks();
                this._loadAvailabilityForecast();

            }, 1500);

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("ProjectDetail")
                .attachPatternMatched(this._onObjectMatched, this);
            this.getView().setModel(
                new JSONModel({
                    recommendations: []
                }),
                "recommendations"
            );
        },

        // SIDEBAR NAVIGATION
        onNavSelect: function (oEvent) {
            const oItem = oEvent.getParameter("item");
            const sKey = oItem.getKey();   // e.g. "employees", "dashboard"

            const sPageId = NAV_PAGES[sKey];
            if (!sPageId) return;

            // Navigate the NavContainer to the target page
            const oNavContainer = this.byId("adminNavContainer");
            const oPage = this.byId(sPageId);
            if (oNavContainer && oPage) {
                oNavContainer.to(oPage);
            }

            // Side effects
            if (sKey === "dashboard") {
                this._loadDashboardCounts();
                this._loadLeaveBreakdown();
                this._loadAvailabilityForecast();
            }
            // if (sKey === "employeeSkills") this._loadEmployeeSkills();
            if (sKey === "forecast") this._loadForecast();
        },
        _loadForecast: async function () {
            try {
                const oModel = this.getView().getModel();
                const oAction = oModel.bindContext("/GetResourceForecast(...)");
                await oAction.invoke();
                const aData =
                    oAction.getBoundContext().getObject().value || [];
                // Store forecast data
                this.getView()
                    .getModel("forecast")
                    .setData({
                        value: aData
                    });
                // Calculate summary
                const available = aData.filter(e => e.CURRENT_STATUS === "Available").length;
                const bench = aData.filter(e => e.CURRENT_STATUS === "Bench").length;
                const leave = aData.filter(e => e.CURRENT_STATUS === "On Leave").length;
                const utilization =
                    aData.length
                        ? Math.round(
                            aData.reduce(
                                (sum, emp) => sum + Number(emp.CURRENT_ALLOCATION),
                                0
                            ) / aData.length
                        )
                        : 0;

                this.getView().getModel("summary")
                    .setData({
                        available,
                        bench,
                        leave,
                        utilization,
                        employeeCount: aData.length
                    });
            } catch (oError) {
                console.error(oError);
                sap.m.MessageBox.error("Failed to load resource forecast.");
            }
        },
        _onObjectMatched: function (oEvent) {
            const sProjectId = oEvent.getParameter("arguments").projectId;
            this.getView().bindElement({
                path: "/PROJECTS('" + sProjectId + "')",
                parameters: {
                    $expand:
                        "manager," +
                        "requirements($expand=requirementSkills($expand=skill))," +
                        "allocations($expand=employee)," +
                        "risks($expand=employee,skill)"
                },
                events: {
                    dataReceived: async () => {
                        const oProject =
                            this.getView()
                                .getBindingContext()
                                .getObject();
                        await this._loadRecommendations(oProject);
                    }
                }
            });
        },

        // Clicking a dashboard tile navigates to that section
        onTilePress: function (oEvent) {

            const sKey = oEvent.getSource().data("nav");

            const oNavContainer = this.byId("adminNavContainer");
            switch (sKey) {
                case "employees":
                    oNavContainer.to(this.byId("employeesPage"));
                    break;
                case "projects":
                    oNavContainer.to(this.byId("projectsPage"));
                    break;
                case "allocations":
                    oNavContainer.to(this.byId("allocationsPage"));
                    break;
                case "leave":
                    oNavContainer.to(this.byId("leavePage"));
                    break;

                case "risks":
                    oNavContainer.to(this.byId("risksPage"));
                    break;
                case "skills":
                    oNavContainer.to(this.byId("skillsPage"));
                    break;
                case "spof":
                    oNavContainer.to(this.byId("spofPage"));
                    break;
                case "forecast":
                    oNavContainer.to(this.byId("forecastPage"));
                default:
                    MessageToast.show("Navigation not implemented for " + sKey);
            }
        },

        // DASHBOARD COUNTS
        _loadDashboardCounts: async function () {
            const oModel = this.getView().getModel();
            if (!oModel) return;
            const _count = async (sPath) => {
                try {
                    const aCtx = await oModel.bindList(sPath).requestContexts(0, 9999);
                    return aCtx.length;
                } catch (e) { return 0; }
            };
            const [nEmp, nProj, nAlloc, nLeave, nSkill] = await Promise.all([
                _count("/EMPLOYEES"),
                _count("/PROJECTS"),
                _count("/ALLOCATIONS"),
                _count("/LEAVE_CALENDAR"),
                _count("/SKILLS")
            ]);

            this.byId("tileEmpCount")?.setValue(String(nEmp));
            this.byId("tileProjCount")?.setValue(String(nProj));
            this.byId("tileAllocCount")?.setValue(String(nAlloc));
            this.byId("tileLeaveCount")?.setValue(String(nLeave));
            this.byId("tileSkillCount")?.setValue(String(nSkill));

            const oDashModel = this.getView().getModel("dash");
            oDashModel.setProperty("/empCount", nEmp);
            oDashModel.setProperty("/projCount", nProj);
            oDashModel.setProperty("/allocCount", nAlloc);
            oDashModel.setProperty("/leaveCount", nLeave);
            oDashModel.setProperty("/skillCount", nSkill);

            try {
                const oFn = oModel.bindContext("/DetectSPOF(...)");
                await oFn.invoke();
                const aSpof = oFn.getBoundContext().getObject().value || [];
                const nSpof = aSpof.length;
                this.byId("tileSpofCount")?.setValue(String(nSpof));

                oDashModel.setProperty("/spofCount", nSpof);
                oDashModel.setProperty(
                    "/spofPercent",
                    nSkill > 0 ? Math.round((nSpof / nSkill) * 100) : 0
                );
            } catch (e) {
                this.byId("tileSpofCount")?.setValue("—");
            }
        },

        // LEAVE REQUESTS — status breakdown for the dashboard donut chart

        _loadLeaveBreakdown: async function () {
            const oModel = this.getView().getModel();
            if (!oModel) return;
            const _countByStatus = async (sStatus) => {
                try {
                    const aCtx = await oModel
                        .bindList("/LEAVE_CALENDAR", null, null, [
                            new Filter("STATUS", FilterOperator.EQ, sStatus)
                        ])
                        .requestContexts(0, 9999);
                    return aCtx.length;
                } catch (e) {
                    return 0;
                }
            };

            const [nPending, nApproved, nRejected] = await Promise.all([
                _countByStatus("PENDING"),
                _countByStatus("APPROVED"),
                _countByStatus("REJECTED")
            ]);

            const oDashModel = this.getView().getModel("dash");
            oDashModel.setProperty("/leavePending", nPending);
            oDashModel.setProperty("/leaveApproved", nApproved);
            oDashModel.setProperty("/leaveRejected", nRejected);
        },

        // EMPLOYEE — Add Dialog

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
                DESIGNATION_ID: this.byId("empDesignation").getSelectedKey()
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
                this._loadDashboardCounts();
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

        onEmployeeFilterChange: function () {
            clearTimeout(this._searchTimer);
            this._searchTimer = setTimeout(async () => {
                try {
                    const sSearch = this.byId("employeeSearch").getValue();
                    const sStatus = this.byId("statusFilter").getSelectedKey();
                    const fMinExp =
                        parseFloat(
                            this.byId("experienceFilter")
                                .getValue()
                        ) || 0;
                    const oAction = this.getView().getModel().bindContext("/SearchEmployees(...)");
                    oAction.setParameter("search", sSearch);
                    oAction.setParameter("status", sStatus);
                    oAction.setParameter("designation", null);
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
            }, 300);
        },

        // DESIGNATION
        onOpenDesignationDialog: async function () {
            if (!this._oDesignationDialog) {
                this._oDesignationDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.AddDesignation",
                    controller: this
                });
                this.getView().addDependent(this._oDesignationDialog);
            }
            this._oDesignationDialog.open();
        },

        onCloseDesignation: function () { this._oDesignationDialog.close(); },

        onSaveDesignation: async function () {
            const oPayload = {
                NAME: this.byId("designationNameInput").getValue(),
                LEVEL: parseInt(this.byId("designationLevelInput").getValue())
            };
            if (!oPayload.NAME) { MessageToast.show("Name is required"); return; }
            try {
                const oCtx = this.getView().getModel().bindList("/DESIGNATIONS").create(oPayload);
                await oCtx.created();
                MessageToast.show("Designation Created");
                this.byId("designationsTable")?.getBinding("items")?.refresh();
                this._oDesignationDialog.close();
            } catch (e) { MessageBox.error(e.message || "Failed"); }
        },
        onDeleteDesignation: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            if (!oContext) {return;}
            const oModel = this.getView().getModel();
            const oDesignation = oContext.getObject();
            MessageBox.confirm(
                "Are you sure you want to delete this designation?",
                {
                    actions: [
                        MessageBox.Action.YES,
                        MessageBox.Action.NO
                    ],
                    emphasizedAction: MessageBox.Action.NO,
                    onClose: async (sAction) => {
                        if (sAction !== MessageBox.Action.YES) {
                            return;
                        }
                        try {
                            // Check if any employee is using this designation
                            const aEmployeeContexts = await oModel
                                .bindList(
                                    "/EMPLOYEES",
                                    null,
                                    null,
                                    [
                                        new Filter(
                                            "DESIGNATION_ID",
                                            FilterOperator.EQ,
                                            oDesignation.ID
                                        )
                                    ]
                                )
                                .requestContexts(0, 1);
                            if (aEmployeeContexts.length > 0) {
                                MessageBox.warning(
                                    "This designation is assigned to one or more employees and cannot be deleted."
                                );
                                return;
                            }
                            await oContext.delete("$auto");
                            MessageToast.show(
                                "Designation deleted successfully."
                            );
                            this.byId("designationsTable")
                                .getBinding("items")
                                .refresh();
                        } catch (oError) {
                            console.error(oError);
                            MessageBox.error(
                                oError.message || "Unable to delete designation."
                            );
                        }
                    }
                }
            );
        },

        // SKILL CATEGORY

        onOpenSkillCategoryDialog: async function () {
            if (!this._oSkillCategoryDialog) {
                this._oSkillCategoryDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.AddSkillCategory",
                    controller: this
                });
                this.getView().addDependent(this._oSkillCategoryDialog);
            }
            this._oSkillCategoryDialog.open();
        },

        onCloseSkillCategory: function () { this._oSkillCategoryDialog.close(); },

        onSaveSkillCategory: async function () {
            const oPayload = { CATEGORY_NAME: this.byId("categoryNameInput").getValue() };
            if (!oPayload.CATEGORY_NAME) { MessageToast.show("Name is required"); return; }
            try {
                const oCtx = this.getView().getModel().bindList("/SKILL_CATEGORIES").create(oPayload);
                await oCtx.created();
                MessageToast.show("Skill Category Created");
                this.byId("skillCategoriesTable")?.getBinding("items")?.refresh();
                this._oSkillCategoryDialog.close();
            } catch (e) { MessageBox.error(e.message || "Failed"); }
        },

        onEditSkillCategory: function () { this._editSelected("skillCategoriesTable", "CATEGORY_NAME"); },

        onDeleteSkillCategory: function () { this._deleteSelected("skillCategoriesTable"); },

        // SKILL

        onOpenSkillDialog: async function () {
            if (!this._oSkillDialog) {
                this._oSkillDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.AddSkill",
                    controller: this
                });
                this.getView().addDependent(this._oSkillDialog);
            }
            this._oSkillDialog.open();
        },

        onCloseSkill: function () { this._oSkillDialog.close(); },

        onSaveSkill: async function () {
            const oPayload = {
                SKILL_NAME: this.byId("skillNameInput").getValue(),
                category_ID: this.byId("skillCategoryCombo").getSelectedKey()
            };
            if (!oPayload.SKILL_NAME) { MessageToast.show("Skill Name is required"); return; }
            try {
                const oCtx = this.getView().getModel().bindList("/SKILLS").create(oPayload);
                await oCtx.created();
                MessageToast.show("Skill Created");
                this.byId("skillsTable")?.getBinding("items")?.refresh();
                this._loadDashboardCounts();
                this._oSkillDialog.close();
            } catch (e) { MessageBox.error(e.message || "Failed"); }
        },

        onEditSkill: function () { this._editSelected("skillsTable", "SKILL_NAME"); },
        onDeleteSkill: function () { this._deleteSelected("skillsTable"); },


        // EDIT / DELETE helpers
        _editSelected: function (sTableId, sField) {
            const oTable = this.byId(sTableId);
            const oItem = oTable?.getSelectedItem();
            if (!oItem) { MessageToast.show("Please select a row to edit"); return; }
            const oCtx = oItem.getBindingContext();
            MessageBox.prompt("Edit value:", {
                initialValue: oCtx.getProperty(sField),
                onClose: async (sAction, sValue) => {
                    if (sAction === MessageBox.Action.OK && sValue) {
                        try {
                            await oCtx.setProperty(sField, sValue);
                            await this.getView().getModel().submitBatch("$auto");
                            MessageToast.show("Updated successfully");
                        } catch (e) { MessageBox.error(e.message || "Update failed"); }
                    }
                }
            });
        },

        _deleteSelected: function (sTableId) {
            const oTable = this.byId(sTableId);
            const oItem = oTable?.getSelectedItem();
            if (!oItem) { MessageToast.show("Please select a row to delete"); return; }
            MessageBox.confirm("Are you sure you want to delete this record?", {
                onClose: async (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        try {
                            await oItem.getBindingContext().delete("$auto");
                            MessageToast.show("Deleted successfully");
                        } catch (e) { MessageBox.error(e.message || "Delete failed"); }
                    }
                }
            });
        },

        // PROJECT

        onCreateProject: async function () {
            this.getView().getModel("projectModel").setData({ skills: [] });
            if (!this._oProjectDialog) {
                this._oProjectDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.AddProject",
                    controller: this
                });
                this.getView().addDependent(this._oProjectDialog);
            }
            this._oProjectDialog.open();
        },

        onCloseProjectDialog: function () { this._oProjectDialog.close(); },

        onAddRequiredSkill: function () {
            const oModel = this.getView().getModel("projectModel");
            const aSkills = oModel.getProperty("/skills") || [];
            aSkills.push({ skill_ID: "", REQUIRED_LEVEL: 1 });
            oModel.setProperty("/skills", aSkills);
        },

        onDeleteRequiredSkill: function (oEvent) {
            const oModel = this.getView().getModel("projectModel");
            const aSkills = oModel.getProperty("/skills");
            const iIndex = this.byId("requiredSkillsTable").indexOfItem(oEvent.getSource().getParent());
            aSkills.splice(iIndex, 1);
            oModel.setProperty("/skills", aSkills);
        },

        onSaveProject: async function () {
            const oModel = this.getView().getModel();
            const aSkills = this.getView().getModel("projectModel").getProperty("/skills");
            const sName = this.byId("projectName").getValue();
            if (!sName) { MessageToast.show("Project Name is required"); return; }

            const oPayload = {
                PROJECT_NAME: sName,
                DESCRIPTION: this.byId("projectDescription").getValue(),
                START_DATE: this.byId("projectStartDate").getDateValue()?.toISOString().split("T")[0],
                END_DATE: this.byId("projectEndDate").getDateValue()?.toISOString().split("T")[0],
                STATUS: this.byId("projectStatus").getSelectedKey(),
                manager_ID: this.byId("projectManager").getSelectedKey(),
                requirements: [{
                    requirementSkills: aSkills.map(s => ({
                        skill_ID: s.skill_ID, REQUIRED_LEVEL: parseInt(s.REQUIRED_LEVEL) || 1, REQUIRED_RESOURCES: 1
                    }))
                }]
            };
            try {
                const oCtx = oModel.bindList("/PROJECTS").create(oPayload);
                await oCtx.created();
                MessageToast.show("Project Created Successfully");
                this._loadDashboardCounts();
                this._oProjectDialog.close();
                oModel.refresh();
            } catch (e) { MessageBox.error(e.message || "Project Creation Failed"); }
        },

        onViewProject: function (oEvent) {
            const sId = oEvent.getSource().getBindingContext().getProperty("ID");
            const oFCL = this.getOwnerComponent().getRootControl().byId("fcl");
            oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);

            this.getOwnerComponent().getRouter().navTo("ProjectDetail", {
                    projectId: sId
                });
        },
        onProjectSearch: function (oEvent) {
            const sValue = oEvent.getParameter("newValue");
            const oTable = this.byId("projectsTable");
            const oBinding = oTable.getBinding("items");
            if (!sValue) {
                oBinding.filter([]);
                return;
            }
            const aFilters = [
                new Filter("PROJECT_ID", FilterOperator.Contains, sValue),
                new Filter("PROJECT_NAME", FilterOperator.Contains, sValue),
                new Filter("DESCRIPTION", FilterOperator.Contains, sValue),
                new Filter("STATUS", FilterOperator.Contains, sValue)
            ];
            oBinding.filter(new Filter({
                filters: aFilters,
                and: false
            }));
        },
        //SPOF Risks
        onLoadSpofRisks: async function () {
            const oModel = this.getView().getModel();
            try {
                const oBinding = oModel.bindContext("/DetectSPOF(...)");
                await oBinding.execute();
                const oResult = oBinding.getBoundContext().getObject();
                const aRisks = oResult.value || [];
                const oRiskModel =new sap.ui.model.json.JSONModel({risks: aRisks});

                this.getView().setModel( oRiskModel,"spof");
                this.byId("tileSpofCount")
                    ?.setValue(aRisks.length);
                const oDashModel = this.getView().getModel("dash");
                const nSkillCount = oDashModel.getProperty("/skillCount") || 0;
                oDashModel.setProperty("/spofCount", aRisks.length);
                oDashModel.setProperty(
                    "/spofPercent",
                    nSkillCount > 0 ? Math.round((aRisks.length / nSkillCount) * 100) : 0
                );
            } catch (oError) {
                console.error("Error loading SPOF risks",oError);
                sap.m.MessageToast.show("Failed to load SPOF Risks" );
            }
        },
        riskStateFormatter: function (sRiskLevel) {
            switch (sRiskLevel) {
                case "HIGH":
                    return "Error";
                case "MEDIUM":
                    return "Warning";
                case "LOW":
                    return "Success";
                default:
                    return "None";
            }
        },
        onApproveLeave: function (oEvent) {
            const oLeave =
                oEvent.getSource().getBindingContext().getObject();
            this._updateLeaveStatus(
                oLeave.ID,
                "APPROVED"
            );
        },
        onRejectLeave: function (oEvent) {
            const oLeave =oEvent.getSource().getBindingContext().getObject();
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
                    throw new Error( "Failed to update leave");
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
        _loadAvailabilityForecast: async function () {
            try {
                const oModel =this.getView().getModel();
                const oAction =oModel.bindContext("/GetAvailabilityForecast(...)");
                await oAction.execute();
                const oData =oAction.getBoundContext().getObject();
                this.getView().getModel("forecast").setData(oData);
            } catch (e) {
                console.error("Forecast Load Error", e);
            }
        },
        _loadRecommendations: async function (oProject) {
            const oModel = this.getView().getModel();
            let aRecommendations = [];
            const aRequirements =oProject.requirements || [];
            for (const oRequirement of aRequirements) {
                const aSkills =oRequirement.requirementSkills || [];
                for (const oSkill of aSkills) {
                    try {
                        const oAction =
                            oModel.bindContext(
                                "/RecommendResources(...)"
                            );
                        console.log("Requirement Skill:", oSkill);
                        oAction.setParameter(
                            "skill_ID",
                            oSkill.skill?.ID || oSkill.skill_ID
                        );
                        oAction.setParameter(
                            "requiredLevel",
                            oSkill.REQUIRED_LEVEL
                        );
                        console.log(
                            "Calling RecommendResources",
                            oSkill.skill?.SKILL_NAME,
                            oSkill.skill?.ID || oSkill.skill_ID,
                            oSkill.REQUIRED_LEVEL
                        );
                        await oAction.execute();
                        const aResult =
                            oAction
                                .getBoundContext()
                                .getObject()
                                .value || [];

                        aRecommendations.push(...aResult);
                    } catch (oError) {
                        console.error(oError);
                    }
                }
            }
            const aFinal =
                Object.values(oUnique)
                    .sort(
                        (a, b) =>
                            b.AVAILABLE_PERCENT -
                            a.AVAILABLE_PERCENT
                    );

            this.getView()
                .getModel("recommendations")
                .setProperty(
                    "/recommendations",
                    aFinal
                );
        },
        _loadForecast: async function () {
            try {
                const oModel = this.getOwnerComponent().getModel();
                const oAction =
                    oModel.bindContext("/GetResourceForecast(...)");
                await oAction.invoke();
                const aData =
                    oAction.getBoundContext().getObject().value || [];
                this.getView()
                    .getModel("forecast")
                    .setData({
                        value: aData
                    });
                this._calculateSummary(aData);
            } catch (e) {
                console.error(e);
                MessageToast.show(
                    "Unable to load forecast."
                );
            }
        },

        _calculateSummary: function (aData) {
            const available =
                aData.filter(x =>
                    x.CURRENT_STATUS === "Available"
                ).length;
            const bench =
                aData.filter(x =>
                    x.CURRENT_STATUS === "Bench"
                ).length;
            const leave =
                aData.filter(x =>
                    x.CURRENT_STATUS === "On Leave"
                ).length;
            const utilization =
                aData.length
                    ? Math.round(
                        aData.reduce(
                            (s, x) =>
                                s + x.CURRENT_ALLOCATION,
                            0
                        ) / aData.length
                    )
                    : 0;
            this.getView()
                .getModel("summary")
                .setData({
                    available,
                    bench,
                    leave,
                    utilization,
                    employeeCount:
                        aData.length

                });
        },
        _applyFilters: function () {
            const aFilters = [];
            // Search
            if (this._searchValue) {
                aFilters.push(
                    new Filter({
                        filters: [
                            new Filter(
                                "NAME",
                                FilterOperator.Contains,
                                this._searchValue
                            ),
                            new Filter(
                                "EMP_ID",
                                FilterOperator.Contains,
                                this._searchValue
                            ),
                            new Filter(
                                "DESIGNATION",
                                FilterOperator.Contains,
                                this._searchValue
                            )

                        ],
                        and: false
                    })
                );
            }
            // Status
            if (this._statusValue) {
                aFilters.push(
                    new Filter(
                        "CURRENT_STATUS",
                        FilterOperator.EQ,
                        this._statusValue
                    )
                );
            }
            // Allocation
            if (this._allocationValue) {
                switch (this._allocationValue) {
                    case "0":
                        aFilters.push(
                            new Filter(
                                "CURRENT_ALLOCATION",
                                FilterOperator.EQ,
                                0
                            )
                        );
                        break;
                    case "50":
                        aFilters.push(
                            new Filter(
                                "CURRENT_ALLOCATION",
                                FilterOperator.LT,
                                50
                            )
                        );
                        break;
                    case "100":
                        aFilters.push(
                            new Filter(
                                "CURRENT_ALLOCATION",
                                FilterOperator.EQ,
                                100
                            )
                        );
                        break;
                }
            }
            this.byId("forecastTable")
                .getBinding("items")
                .filter(aFilters);
        },
        onForecastSearch: function (oEvent) {
            this._searchValue =
                oEvent.getParameter("newValue");
            this._applyFilters();
        },
        onStatusFilter: function (oEvent) {
            this._statusValue =
                oEvent.getSource().getSelectedKey();
            this._applyFilters();
        },
        onAllocationFilter: function (oEvent) {
            this._allocationValue =
                oEvent.getSource().getSelectedKey();
            this._applyFilters();
        },
        onClearFilters: function () {
            this._searchValue = "";
            this._statusValue = "";
            this._allocationValue = "";
            this.byId("forecastSearch").setValue("");
            this.byId("statusFilter").setSelectedKey("");
            this.byId("allocationFilter").setSelectedKey("");
            this._applyFilters();
            MessageToast.show("Filters cleared.");
        },
        onRefreshForecast: async function () {
            await this._loadForecast();
            this._searchValue = "";
            this._statusValue = "";
            this._allocationValue = "";
            if (this.byId("forecastSearch")) {
                this.byId("forecastSearch").setValue("");
            }
            if (this.byId("statusFilter")) {
                this.byId("statusFilter").setSelectedKey("");
            }
            if (this.byId("allocationFilter")) {
                this.byId("allocationFilter").setSelectedKey("");
            }
            this._applyFilters();
            MessageToast.show("Forecast refreshed.");
        },
        onForecastPress: function (oEvent) {
            const oContext =
                oEvent.getSource()
                    .getBindingContext("forecast");
            if (!oContext) {
                return;
            }
            const oData = oContext.getObject();
            MessageToast.show(
                "Employee : " + oData.NAME
            );
        }

    });

});

