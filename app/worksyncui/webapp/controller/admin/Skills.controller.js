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

    return Controller.extend("com.amista.worksyncui.controller.admin.Skill", {

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
                            MessageToast.show("Skill deleted successfully");
                        } catch (oError) {
                            MessageBox.error("Unable to delete skill");
                            console.error(oError);

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

                MessageToast.show("Skill updated successfully");

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

        onCloseSkillCategory: function () {
            this._oSkillCategoryDialog.close();
        },

        onSaveSkillCategory: async function () {
            const oPayload = {
                CATEGORY_NAME: this.byId("categoryNameInput").getValue()
            };
            if (!oPayload.CATEGORY_NAME) {
                MessageToast.show("Category Name is required");
                return;
            }
            try {
                const oCtx = this.getView()
                    .getModel()
                    .bindList("/SKILL_CATEGORIES")
                    .create(oPayload);
                await oCtx.created();
                MessageToast.show("Skill Category Created");
                this.byId("skillCategoriesTable")
                    .getBinding("items")
                    .refresh();
                this._oSkillCategoryDialog.close();
            } catch (e) {
                MessageBox.error(e.message || "Failed to create Skill Category");
            }
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
            this._oSkillDialog.close();
        },

        onSaveSkill: async function () {
            const oPayload = {
                SKILL_NAME: this.byId("skillNameInput").getValue(),
                category_ID: this.byId("skillCategoryCombo").getSelectedKey()
            };
            if (!oPayload.SKILL_NAME) {
                MessageToast.show("Skill Name is required");
                return;
            }
            try {
                const oCtx = this.getView()
                    .getModel()
                    .bindList("/SKILLS")
                    .create(oPayload);
                await oCtx.created();
                MessageToast.show("Skill Created");
                this.byId("skillsTable")
                    .getBinding("items")
                    .refresh();
                this._oSkillDialog.close();
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

        }, onUpdateSkillCategory: async function () {
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