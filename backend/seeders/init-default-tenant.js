const cryptoJs = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const Tenant = require('../app/models/tenant');
const User = require('../app/models/users');



function hashPassword(password) {
    return cryptoJs.SHA256(password).toString();
}


async function seedDefaultTenant() {
    const existingTenant = await Tenant.findOne({ where: { companyCode: 'DEMOTESTING' } });

    if (!existingTenant) {
        const tenantId = uuidv4();

        const tenant = await Tenant.create({
            id: tenantId,
            companyName: 'Demo Testing Pvt Ltd',
            companyCode: 'DEMOTESTING',
            plan: 'basic',
        });


        const hashedPassword = hashPassword('Admin@123');

        const adminUser = await User.create({
            tenantId: tenant.id,
            name: 'Admin User',
            email: 'testing@demo.com',
            password: hashedPassword,
            role: 'admin',
        });

        console.log('✅ Admin user created:', adminUser.email);
    } else {
        console.log('⚠️ Tenant already exists, skipping seed.');
    }
}

seedDefaultTenant()
    .then(() => {
        console.log('✅ Seeding complete');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    });