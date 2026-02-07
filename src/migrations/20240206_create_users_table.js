export const up = async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_type: {
            type: Sequelize.ENUM('admin', 'user'),
            allowNull: false,
            defaultValue: 'user',
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        },
        phone: {
            type: Sequelize.STRING,
        },
        additional_phone: {
            type: Sequelize.STRING,
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        profile: {
            type: Sequelize.JSON,
        },
        is_active: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
        },

        address_ids: {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: [],
        },
        reset_password_token: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        reset_password_expiry: {
            type: Sequelize.DATE,
            allowNull: true,
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
    await queryInterface.dropTable('users');
};
