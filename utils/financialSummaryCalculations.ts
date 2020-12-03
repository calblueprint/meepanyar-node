import { CustomerRecord } from '../airtable/interface';
import {
    getAllCustomers,
} from '../airtable/requests';

export const calculateTotalCustomers = async () => {
    const customers: CustomerRecord[] = await getAllCustomers();
    return customers.length;
};

// export const calculateTotalCustomersBilled = async () => {
//     const customers: CustomerRecord[] = await getAllCustomers();
//     return customers.length;
// };

// export const calculateTotalCustomersPaid = async () => {
//     const customers: CustomerRecord[] = await getAllCustomers();
//     return customers.length;
// };