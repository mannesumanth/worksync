sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (
    Controller,
    Fragment,
    MessageToast,
    MessageBox,
    JSONModel
) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.Skill", {
        onInit: function () {
        },
        onExit: function () {
            sap.ui.getCore().getEventBus().unsubscribe(
                "Skills", "Refresh",
                this._refreshTables,
                this
            );
        },
        // Refresh both tables
        _refreshTables: function () {
            this.byId("skillsTable")?.getBinding("items")?.refresh();
            this.byId("skillCategoriesTable")?.getBinding("items")?.refresh();
        },

        _refreshSkillCategoryDropdown: function () {
            const oSelect = this.byId("skillCategoryCombo");
            if (oSelect) {
                oSelect.getBinding("items")?.refresh();
            }
        },

        _clearForms: function () {
            if (this.byId("categoryNameInput")) {
                this.byId("categoryNameInput").setValue("");
            }
            if (this.byId("skillNameInput")) {
                this.byId("skillNameInput").setValue("");
            }
            if (this.byId("skillCategoryCombo")) {
                this.byId("skillCategoryCombo").setSelectedKey("");
            }

        },

        _closeDialog: function (oDialog) {

            if (oDialog) {
                oDialog.close();
            }

        },

        onEditSkill: async function (oEvent) {

            const oContext = oEvent.getSource().getBindingContext();

            this._oEditContext = oContext;

            const oSkill = JSON.parse(JSON.stringify(oContext.getObject()));

            // Needed for the Select control
            if (oSkill.category) {
                oSkill.category_ID = oSkill.category.ID;
            }

            if (!this._oEditSkillDialog) {
                this._oEditSkillDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.EditSkill",
                    controller: this
                });

                this.getView().addDependent(this._oEditSkillDialog);
            }

            this.getView().setModel(new JSONModel(oSkill), "edit");

            this._oEditSkillDialog.open();
        },
        onDeleteSkill: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            MessageBox.confirm(
                "Are you sure you want to delete this skill?",
                {
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,

                    onClose: async (sAction) => {

                        if (sAction !== MessageBox.Action.DELETE) {
                            return;
                        }
                        try {
                            await oContext.delete();
                            sap.ui.getCore().getEventBus().publish(
                                "Skills",
                                "Refresh"
                            );
                            MessageToast.show("Skill deleted successfully");
                        } catch (oError) {
                            const sMessage =
                                oError?.error?.message ||
                                oError?.message ||
                                "Unable to delete skill";

                            MessageBox.error(sMessage);


                        }
                    }
                }
            );
        },
        onUpdateSkill: async function () {

            const oData = this.getView().getModel("edit").getData();
            const oOriginal = this._oEditContext.getObject();

            // Check for changes
            const bNoChanges =
                oData.SKILL_NAME === oOriginal.SKILL_NAME &&
                oData.category_ID === (oOriginal.category ? oOriginal.category.ID : oOriginal.category_ID);

            if (bNoChanges) {
                MessageToast.show("No changes detected");
                this._oEditSkillDialog.close();
                return;
            }

            try {

                this._oEditContext.setProperty("SKILL_NAME", oData.SKILL_NAME);
                this._oEditContext.setProperty("category_ID", oData.category_ID);

                await this.getView().getModel().submitBatch("$auto");
                sap.ui.getCore().getEventBus().publish(
                    "Skills",
                    "Refresh"
                );

                MessageToast.show("Skill updated successfully");
                this.byId("skillsTable")
                    .getBinding("items")
                    .refresh();

                this._oEditSkillDialog.close();

            } catch (oError) {

                console.error(oError);
                MessageBox.error("Failed to update skill");

            }
        },

        onCancelSkill: function () {

            this.getView().getModel("edit").destroy();

            this._oEditSkillDialog.close();

        },
        // Skill Category
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
        //Save Skill Category
        onSaveSkillCategory: async function () {
            const oPayload = {
                CATEGORY_NAME: this.byId("categoryNameInput").getValue().trim()
            };
            if (!oPayload.CATEGORY_NAME) {
                MessageToast.show("Category Name is required");
                return;
            }
            const oView = this.getView();
            const oModel = oView.getModel();
            oView.setBusy(true);
            const oCtx = oModel.bindList("/SKILL_CATEGORIES").create(oPayload);
            try {
                await oCtx.created();
                MessageToast.show("Skill Category Created");
                this._refreshTables();
                this._refreshSkillCategoryDropdown();
                this._clearForms();
                this._closeDialog(this._oSkillCategoryDialog);
            } catch (e) {
                console.error(e);
                const sMessage =
                    e?.error?.message ||
                    e?.cause?.error?.message ||
                    e?.message ||
                    "Failed to create Skill Category";
                if (oCtx.isTransient()) {
                    try {
                        await oCtx.delete();
                    } catch (delErr) {
                        console.error("Cleanup failed:", delErr);
                    }
                }
                MessageBox.error(sMessage);
            } finally {
                oView.setBusy(false);
            }
        },
        // Close Skill Category Dialog
        onCloseSkillCategory: function () {
            this._clearForms();
            this._closeDialog(this._oSkillCategoryDialog);
        },

        // Skill
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

        onCloseSkill: function () {
            this._clearForms();
            this._closeDialog(this._oSkillDialog);
        },
        // Save Skill
        onSaveSkill: async function () {
            const oPayload = {
                SKILL_NAME: this.byId("skillNameInput").getValue().trim(),
                category_ID: this.byId("skillCategoryCombo").getSelectedKey()
            };
            if (!oPayload.SKILL_NAME) {
                MessageToast.show("Skill Name is required");
                return;
            }
            if(!oPayload.category_ID) {
                MessageToast.show("Skill Category is required");
                return;
            }
            const oCtx = this.getView()
                .getModel()
                .bindList("/SKILLS")
                .create(oPayload);
            try {
                await oCtx.created();
                sap.ui.getCore().getEventBus().publish(
                    "Skills",
                    "Refresh"
                );
                MessageToast.show("Skill Created");
                this._refreshTables();
                this._clearForms();
                this._closeDialog(this._oSkillDialog);
            } catch (e) {
                MessageBox.error(e.message || "Failed to create Skill");
            }
        },
        onEditSkillCategory: async function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            this._oEditCategoryContext = oContext;
            const oCategory = JSON.parse(JSON.stringify(oContext.getObject()));
            if (!this._oEditCategoryDialog) {
                this._oEditCategoryDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.EditSkillCategory",
                    controller: this
                });
                this.getView().addDependent(this._oEditCategoryDialog);
            }
            this.getView().setModel(
                new JSONModel(oCategory),
                "editCategory"
            );

            this._oEditCategoryDialog.open();

        },
        // Skill Category Update
        onUpdateSkillCategory: async function () {
            const oData = this.getView()
                .getModel("editCategory")
                .getData();

            const oOriginal = this._oEditCategoryContext.getObject();
            if (oData.CATEGORY_NAME === oOriginal.CATEGORY_NAME) {
                MessageToast.show("No changes detected");
                this._oEditCategoryDialog.close();
                return;
            }

            try {
                this._oEditCategoryContext.setProperty(
                    "CATEGORY_NAME",
                    oData.CATEGORY_NAME
                );
                await this.getView()
                    .getModel()
                    .submitBatch("$auto");
                this._refreshTables();
                this._refreshSkillCategoryDropdown();
                MessageToast.show("Category updated successfully");
                this._oEditCategoryDialog.close();
            } catch (e) {
                MessageBox.error("Failed to update category");
                console.error(e);

            }

        },
        onCancelSkillCategory: function () {
            this._oEditCategoryDialog.close();
        },
        // Skill Category Delete
        onDeleteSkillCategory: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            MessageBox.confirm(
                "Are you sure you want to delete this skill category?",
                {
                    actions: [
                        MessageBox.Action.DELETE,
                        MessageBox.Action.CANCEL
                    ],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: async (sAction) => {
                        if (sAction !== MessageBox.Action.DELETE) {
                            return;
                        }
                        try {
                            await oContext.delete();
                            MessageToast.show("Category deleted successfully");
                            this._refreshTables();
                            this._refreshSkillCategoryDropdown();
                        } catch (oError) {
                            const sMessage =
                                oError?.error?.message ||
                                oError?.message ||
                                "Unable to delete category.";
                            MessageBox.warning(sMessage);
                        }

                    }
                }
            );
        }
    });
});