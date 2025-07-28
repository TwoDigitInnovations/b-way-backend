const Billing = require('../src/models/Billing');
const ComplianceReport = require('../src/models/ComplianceReport');
const Driver = require('../src/models/Drivers');
const Hospital = require('../src/models/Hospitals');
const Order = require('../src/models/Orders');
const Payout = require('../src/models/Payout');
const Route = require('../src/models/Routes');
const User = require('../src/models/User');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(
  'mongodb+srv://bwaylogistics1:QCMzJAQGtsVAenvs@cluster0.hfo9pew.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
);

const randomETA = () => {
  const hours = Math.floor(Math.random() * 12) + 1;
  const minutes = Math.floor(Math.random() * 60);
  const period = Math.random() < 0.5 ? 'AM' : 'PM';
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const randomMobile = () => {
  const prefix = Math.floor(Math.random() * 9000000000) + 1000000000;
  return prefix.toString();
};

const seed = async () => {
  try {
    // Clear existing data
    await Promise.all([
      // Order.deleteMany({}),
      Route.deleteMany({}),
      Hospital.deleteMany({}),
      Driver.deleteMany({}),
      ComplianceReport.deleteMany({}),
      Billing.deleteMany({}),
    ]);

    const driverData = await User.find({ role: 'DRIVER' });

    if (!driverData) {
      throw new Error('Driver not found');
    }
    console.log('Driver Data:', driverData);

    const route = await Route.create(
      {
        routeName: 'Route A - North Bergen',
        startLocation: '47 W 13th St, New York',
        endLocation: '20 Cooper Square, New York',
        stops: ['Jammu Hospital', 'Oxford Hospital'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'Archived',
      },
      {
        routeName: 'Route B - North Bergen',
        startLocation: '20 Cooper Square, New York',
        endLocation: '47 W 13th St, New York',
        stops: ['Capitol Hospital'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Sat'],
        status: 'Active',
      },
      {
        routeName: 'Route C - North Bergen',
        startLocation: '47 W 13th St, New York',
        endLocation: '20 Cooper Square, New York',
        stops: ['Jim Pharmacy'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'Active',
      },
      {
        routeName: 'Route D - North Bergen',
        startLocation: '20 Cooper Square, New York',
        endLocation: '47 W 13th St, New York',
        stops: ['Bellevue Hospital', 'Oxford Hospital'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Sat'],
        status: 'Completed',
      },
      {
        routeName: 'Route A - North Bergen',
        startLocation: '47 W 13th St, New York',
        endLocation: '20 Cooper Square, New York',
        stops: ['Oxford Hospital'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'Archived',
      },
      {
        routeName: 'Route B - North Bergen',
        startLocation: '20 Cooper Square, New York',
        endLocation: '47 W 13th St, New York',
        stops: ['Carla G.'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Sat'],
        status: 'Active',
      },
      {
        routeName: 'Route C - North Bergen',
        startLocation: '47 W 13th St, New York',
        endLocation: '20 Cooper Square, New York',
        stops: ['Capitol Hospital'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'Archived',
      },
      {
        routeName: 'Route D - North Bergen',
        startLocation: '20 Cooper Square, New York',
        endLocation: '47 W 13th St, New York',
        stops: ['Bellevue Hospital'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Sat'],
        status: 'Completed',
      },
      {
        routeName: 'Route A - North Bergen',
        startLocation: '47 W 13th St, New York',
        endLocation: '20 Cooper Square, New York',
        stops: ['Jammu Hospital'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'Archived',
      },
      {
        routeName: 'Route B - North Bergen',
        startLocation: '20 Cooper Square, New York',
        endLocation: '47 W 13th St, New York',
        stops: ['Oxford Hospital'],
        assignedDriver: driverData[0]._id,
        eta: randomETA(),
        activeDays: ['Sat'],
        status: 'Completed',
      },
    );

    const hospital = await Hospital.create(
      {
        hospitalName: 'Jammu Hospital',
        address: '47 W 13th St, New York',
        contactPerson: 'David M.',
        phone: randomMobile(),
        assignedRoute: route[0]._id,
        deliveryWindow: {
          startTime: '9:00 AM',
          endTime: '5:00 PM',
        },
        type: 'Hospital',
      },
      {
        no: 2,
        hospitalName: 'Columbia Peds',
        address: '20 Cooper Square, New York',
        contactPerson: 'Carla G.',
        phone: randomMobile(),
        assignedRoute: route[0]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Pharmacy',
      },
      {
        no: 3,
        hospitalName: 'Oxford Hospital',
        address: '47 W 13th St, New York',
        contactPerson: 'David M.',
        phone: randomMobile(),
        assignedRoute: route[0]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Clinic',
      },
      {
        no: 4,
        hospitalName: 'Jammu Hospital',
        address: '20 Cooper Square, New York',
        contactPerson: 'Carla G.',
        phone: randomMobile(),
        assignedRoute: route[1]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Hospital',
      },
      {
        no: 5,
        hospitalName: 'Bellevue Hospital',
        address: '47 W 13th St, New York',
        contactPerson: 'David M.',
        phone: randomMobile(),
        assignedRoute: route[1]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Pharmacy',
      },
      {
        no: 6,
        hospitalName: 'Retarice Lospit',
        address: '20 Cooper Square, New York',
        contactPerson: 'Carla G.',
        phone: randomMobile(),
        assignedRoute: route[1]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Clinic',
      },
      {
        no: 7,
        hospitalName: 'Oxford Hospital',
        address: '47 W 13th St, New York',
        contactPerson: 'David M.',
        phone: randomMobile(),
        assignedRoute: route[2]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Hospital',
      },
      {
        no: 8,
        hospitalName: 'Jammu Hospital',
        address: '20 Cooper Square, New York',
        contactPerson: 'Carla G.',
        phone: randomMobile(),
        assignedRoute: route[1]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Pharmacy',
      },
      {
        no: 9,
        hospitalName: 'NYU Langone',
        address: '47 W 13th St, New York',
        contactPerson: 'David M.',
        phone: randomMobile(),
        assignedRoute: route[0]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Clinic',
      },
      {
        no: 10,
        hospitalName: 'Columbia Peds',
        address: '20 Cooper Square, New York',
        contactPerson: 'Carla G.',
        phone: randomMobile(),
        assignedRoute: route[1]._id,
        deliveryWindow: {
          startTime: '2:00 PM',
          endTime: '6:00 PM',
        },
        type: 'Hospital',
      },
    );

    const driver = await Driver.create(
      {
        driver: driverData[0]._id,
        licenseNumber: '000-000-0000',
        vehicleType: 'Van',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Active',
      },
      {
        driver: driverData[0]._id,
        licenseNumber: '000-000-0000',
        vehicleType: 'Van',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Off-Duty',
      },
      {
        driver: driverData[0]._id,
        licenseNumber: '000-000-0000',
        vehicleType: 'Car',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Active',
      },
      {
        driver: driverData[0]._id,
        licenseNumber: '000-000-0000',
        vehicleType: 'Truck',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'On-Delivery',
      },
      {
        driver: driverData[0]._id,
        licenseNumber: '000-000-0000',
        vehicleType: 'Van',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Active',
      },
      {
        no: 5,
        driver: driverData[0]._id,
        email: 'info@example.com',
        phone: '000-000-0000',
        licenseNumber: '000-000-0000',
        vehicleType: 'Car',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Off-Duty',
      },
      {
        no: 6,
        driver: driverData[0]._id,
        email: 'info@example.com',
        phone: '000-000-0000',
        licenseNumber: '000-000-0000',
        vehicleType: 'Truck',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'On-Delivery',
      },
      {
        no: 7,
        driver: driverData[0]._id,
        email: 'info@example.com',
        phone: '000-000-0000',
        licenseNumber: '000-000-0000',
        vehicleType: 'Van',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Off-Duty',
      },
      {
        no: 8,
        driver: driverData[0]._id,
        email: 'info@example.com',
        phone: '000-000-0000',
        licenseNumber: '000-000-0000',
        vehicleType: 'Car',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Active',
      },
      {
        no: 9,
        driver: driverData[0]._id,
        email: 'info@example.com',
        phone: '000-000-0000',
        licenseNumber: '000-000-0000',
        vehicleType: 'Truck',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Off-Duty',
      },
      {
        no: 10,
        driver: driverData[0]._id,
        email: 'info@example.com',
        phone: '000-000-0000',
        licenseNumber: '000-000-0000',
        vehicleType: 'Van',
        assignedRoute: route.find(
          (r) => r.assignedDriver.toString() === driverData[0]._id.toString(),
        )._id,
        status: 'Active',
      },
    );

    // const order = await Order.create(
    //   {
    //     items: 'IV Adventure - Carthe',
    //     qty: 12,
    //     pickupLocation: '47 W 13th St, New York',
    //     deliveryLocation: '20 Cooper Square, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[0]._id,
    //     status: 'Cancelled',
    //     eta: randomETA(),
    //   },
    //   {
    //     no: 2,
    //     orderId: 'ORD-20943',
    //     items: 'IV Adventure',
    //     qty: 20,
    //     pickupLocation: '20 Cooper Square, New York',
    //     deliveryLocation: '47 W 13th St, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[1]._id,
    //     status: 'Delivered',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Adventure',
    //     qty: 15,
    //     pickupLocation: '47 W 13th St, New York',
    //     deliveryLocation: '20 Cooper Square, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[2]._id,
    //     status: 'Picked Up',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Adventure - NCU',
    //     qty: 10,
    //     pickupLocation: '20 Cooper Square, New York',
    //     deliveryLocation: '47 W 13th St, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[3]._id,
    //     status: 'Scheduled',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Adventure - Carthe',
    //     qty: 12,
    //     pickupLocation: '47 W 13th St, New York',
    //     deliveryLocation: '20 Cooper Square, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[0]._id,
    //     status: 'Return Created',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Osostrutus',
    //     qty: 50,
    //     pickupLocation: '20 Cooper Square, New York',
    //     deliveryLocation: '47 W 13th St, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[1]._id,
    //     status: 'Invoice Generated',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Adventure - Carthe',
    //     qty: 15,
    //     pickupLocation: '47 W 13th St, New York',
    //     deliveryLocation: '20 Cooper Square, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[2]._id,
    //     status: 'Scheduled',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Adventure',
    //     qty: 20,
    //     pickupLocation: '20 Cooper Square, New York',
    //     deliveryLocation: '47 W 13th St, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[3]._id,
    //     status: 'Delivered',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Adventure - Carthe',
    //     qty: 25,
    //     pickupLocation: '47 W 13th St, New York',
    //     deliveryLocation: '20 Cooper Square, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[0]._id,
    //     status: 'Cancelled',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Adventure - Carthe',
    //     qty: 36,
    //     pickupLocation: '20 Cooper Square, New York',
    //     deliveryLocation: '47 W 13th St, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[1]._id,
    //     status: 'Delivered',
    //     eta: randomETA(),
    //   },
    //   {
    //     items: 'IV Adventure - Alok',
    //     qty: 36,
    //     pickupLocation: '20 Cooper Square, New York',
    //     deliveryLocation: '47 W 13th St, New York',
    //     assignedDriver: driverData[0]._id,
    //     route: route[2]._id,
    //     status: 'Delivered',
    //     eta: randomETA(),
    //   },
    // );

    const compliance = await ComplianceReport.create(
      {
        date: new Date('2025-06-22'),
        regulationType: 'PCI DSS',
        audit: 100,
        violation: 40,
        violationType: 'Payment Processing',
        status: 'Completed',
      },
      {
        no: 1,
        date: new Date('2025-06-15'),
        regulationType: 'Hipaa',
        audit: 50,
        violation: 50,
        violationType: 'Data Breach',
        status: 'Pending',
      },
      {
        no: 2,
        date: new Date('2025-06-16'),
        regulationType: 'GDPR',
        audit: 30,
        violation: 20,
        violationType: 'Data Processing',
        status: 'Pending',
      },
      {
        no: 3,
        date: new Date('2025-06-17'),
        regulationType: 'PCI DSS',
        audit: 40,
        violation: 10,
        violationType: 'Payment Security',
        status: 'Completed',
      },
      {
        no: 4,
        date: new Date('2025-06-18'),
        regulationType: 'SOX',
        audit: 60,
        violation: 15,
        violationType: 'Financial Reporting',
        status: 'Completed',
      },
      {
        no: 5,
        date: new Date('2025-06-19'),
        regulationType: 'FISMA',
        audit: 70,
        violation: 25,
        violationType: 'Information Security',
        status: 'Pending',
      },
      {
        no: 6,
        date: new Date('2025-06-20'),
        regulationType: 'HIPAA',
        audit: 80,
        violation: 30,
        violationType: 'Data Privacy',
        status: 'Completed',
      },
      {
        no: 7,
        date: new Date('2025-06-21'),
        regulationType: 'GDPR',
        audit: 90,
        violation: 35,
        violationType: 'Data Protection',
        status: 'Pending',
      },
      {
        no: 8,
        date: new Date('2025-06-22'),
        regulationType: 'PCI DSS',
        audit: 100,
        violation: 40,
        violationType: 'Payment Processing',
        status: 'Completed',
      },
      {
        no: 9,
        date: new Date('2025-06-23'),
        regulationType: 'SOX',
        audit: 110,
        violation: 45,
        violationType: 'Financial Compliance',
        status: 'Pending',
      },
      {
        no: 10,
        date: new Date('2025-06-24'),
        regulationType: 'FISMA',
        audit: 120,
        violation: 50,
        violationType: 'Information Assurance',
        status: 'Completed',
      },
    );

    const billing = await Billing.create(
      {
        hospital: hospital[0]._id,
        courier: '#COU-0000438756675',
        invoiceDate: new Date('2025-06-17'),
        dueDate: new Date('2025-07-07'),
        amount: 300,
        status: 'Paid',
      },
      {
        no: 1,
        hospital: hospital[1]._id,
        courier: '#COU-0000438756673',
        invoiceDate: new Date('2025-06-15'),
        dueDate: new Date('2025-07-05'),
        amount: 220,
        status: 'Unpaid',
      },
      {
        no: 2,
        hospital: hospital[2]._id,
        courier: '#COU-0000438756674',
        invoiceDate: new Date('2025-06-16'),
        dueDate: new Date('2025-07-06'),
        amount: 150,
        status: 'Paid',
      },
      {
        no: 3,
        hospital: hospital[0]._id,
        courier: '#COU-0000438756675',
        invoiceDate: new Date('2025-06-17'),
        dueDate: new Date('2025-07-07'),
        amount: 300,
        status: 'Paid',
      },
      {
        no: 4,
        hospital: hospital[3]._id,
        courier: '#COU-0000438756676',
        invoiceDate: new Date('2025-06-18'),
        dueDate: new Date('2025-07-08'),
        amount: 400,
        status: 'Paid',
      },
      {
        no: 5,
        hospital: hospital[4]._id,
        courier: '#COU-0000438756677',
        invoiceDate: new Date('2025-06-19'),
        dueDate: new Date('2025-07-09'),
        amount: 700,
        status: 'Unpaid',
      },
      {
        no: 6,
        hospital: hospital[0]._id,
        courier: '#COU-0000438756678',
        invoiceDate: new Date('2025-06-20'),
        dueDate: new Date('2025-07-10'),
        amount: 800,
        status: 'Paid',
      },
      {
        no: 7,
        hospital: hospital[0]._id,
        courier: '#COU-0000438756679',
        invoiceDate: new Date('2025-06-21'),
        dueDate: new Date('2025-07-11'),
        amount: 900,
        status: 'Partially Paid',
      },
      {
        no: 8,
        hospital: hospital[0]._id,
        courier: '#COU-0000438756680',
        invoiceDate: new Date('2025-06-22'),
        dueDate: new Date('2025-07-12'),
        amount: 100,
        status: 'Partially Paid',
      },
      {
        no: 9,
        hospital: hospital[0]._id,
        courier: '#COU-0000438756681',
        invoiceDate: new Date('2025-06-23'),
        dueDate: new Date('2025-07-13'),
        amount: 110,
        status: 'Unpaid',
      },
      {
        no: 10,
        hospital: hospital[0]._id,
        courier: '#COU-0000438756682',
        invoiceDate: new Date('2025-06-24'),
        dueDate: new Date('2025-07-14'),
        amount: 120,
        status: 'Paid',
      },
    );

    const payout = await Payout.create(
      {
        driver: driverData[0]._id,
        deliveries: 20,
        payoutRate: 10,
        totalPayout: 200,
        deduction: 20,
        bonus: 10,
        paymentMethod: 'ACH',
        status: 'Paid',
      },
      {
        driver: driverData[0]._id,
        deliveries: 20,
        payoutRate: 10,
        totalPayout: 200,
        deduction: 20,
        bonus: 10,
        paymentMethod: 'ACH',
        status: 'Pending',
      },
      {
        driver: driverData[0]._id,
        deliveries: 20,
        payoutRate: 10,
        totalPayout: 200,
        deduction: 20,
        bonus: 10,
        paymentMethod: 'ACH',
        status: 'Paid',
      },
      {
        driver: driverData[0]._id,
        deliveries: 20,
        payoutRate: 10,
        totalPayout: 200,
        deduction: 20,
        bonus: 10,
        paymentMethod: 'ACH',
        status: 'Pending',
      },
      {
        driver: driverData[0]._id,
        deliveries: 20,
        payoutRate: 10,
        totalPayout: 200,
        deduction: 20,
        bonus: 10,
        paymentMethod: 'ACH',
        status: 'Paid',
      },
    );

    console.log('✅ Database seeded successfully!');
  } catch (err) {
    console.error('❌ Error seeding database:', err);
  } finally {
    mongoose.connection.close();
  }
};

seed();
