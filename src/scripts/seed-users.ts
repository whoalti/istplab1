
import dotenv from 'dotenv';
dotenv.config(); 

import { AppDataSource } from "../config/database";
import { Administrator } from "../entities/Administrator";
import { Buyer } from "../entities/Buyer";
import bcrypt from "bcrypt";


async function seed() {
    try {
        await AppDataSource.initialize();
        console.log("Database connection established");

        const adminRepository = AppDataSource.getRepository(Administrator);
        const buyerRepository = AppDataSource.getRepository(Buyer);

        const existingAdmin = await adminRepository.findOne({
            where: { username: "testadmin" }
        });

        if (!existingAdmin) {
            const adminPasswordHash = await bcrypt.hash("admin123", 10);
            const admin = adminRepository.create({
                username: "testadmin",
                password_hash: adminPasswordHash
            });

            await adminRepository.save(admin);
            console.log("Test administrator created:");
            console.log({
                username: "testadmin",
                password: "admin123" 
            });
        } else {
            console.log("Test administrator already exists");
        }

        const existingBuyer = await buyerRepository.findOne({
            where: { username: "testbuyer" }
        });

        if (!existingBuyer) {
            const buyerPasswordHash = await bcrypt.hash("buyer123", 10);
            const buyer = buyerRepository.create({
                username: "testbuyer",
                password_hash: buyerPasswordHash
            });

            await buyerRepository.save(buyer);
            console.log("Test buyer created:");
            console.log({
                username: "testbuyer",
                password: "buyer123" 
            });
        } else {
            console.log("Test buyer already exists");
        }

        console.log("Seed completed successfully");
    } catch (error) {
        console.error("Error during seeding:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

seed().then(() => {
    console.log("Seeding process finished");
    process.exit(0);
}).catch(error => {
    console.error("Fatal error during seeding:", error);
    process.exit(1);
});