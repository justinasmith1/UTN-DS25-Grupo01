import { PrismaClient, Lote } from "../generated/prisma";
 const prisma = new PrismaClient({
 log: ["error", "warn", "query"], 
 });
 export default prisma;

