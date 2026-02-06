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

        address_id: {
            type: Sequelize.INTEGER,
            references: {
                model: 'addresses',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
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
