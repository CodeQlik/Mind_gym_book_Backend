export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("faqs", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    question: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    answer: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable("faqs");
};
