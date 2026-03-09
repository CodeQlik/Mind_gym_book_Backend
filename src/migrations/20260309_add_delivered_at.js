import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn("orders", "delivered_at", {
    type: DataTypes.DATE,
    allowNull: true,
    after: "dispatch_note",
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn("orders", "delivered_at");
}
