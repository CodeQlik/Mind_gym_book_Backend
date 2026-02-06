export const up = async (queryInterface, Sequelize) => {
    await queryInterface.createTable('addresses', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        street: {
            type: Sequelize.STRING,
            allowNull: false
        },
        city: {
            type: Sequelize.STRING,
            allowNull: false
        },
        state: {
            type: Sequelize.STRING,
            allowNull: false
        },
        pin_code: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        country: {
            type: Sequelize.STRING,
            defaultValue: "India"
        },
        created_at: {
            allowNull: false,
            type: Sequelize.DATE
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE
        }
    });
};

export const down = async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('addresses');
};
