import { Db, ObjectId } from "mongodb";
import { InstitutionAttribute } from "../infrastructure/models/InstitutionAttribute";

export class InstitutionAttributeService {
    private collectionName = "attribute_institutions";

    constructor(private db: Db) { }

    async getAll(): Promise<InstitutionAttribute[]> {
        return this.db.collection<InstitutionAttribute>(this.collectionName).find().toArray();
    }
    async getAvailableInstitutions(): Promise<any[]> {
        const allInstitutions = await this.db.collection("institutions").find().toArray();
        const usedCodes = await this.db.collection(this.collectionName).distinct("institutionCode");
        return allInstitutions.filter(inst => !usedCodes.includes(inst.code));
      }
      
      async getAllWithInstitutionNamePaginated(limit: number, offset: number): Promise<{ items: any[], total: number }> {
        const pipeline = [
          {
            $lookup: {
              from: "institutions",
              localField: "institutionCode",
              foreignField: "code",
              as: "institution"
            }
          },
          { $unwind: "$institution" },
          {
            $project: {
              institutionCode: 1,
              primaryColor: 1,
              secondaryColor: 1,
              avatar: 1,
              logo: 1,
              logoDark: { $getField: { field: "logo-dark", input: "$$ROOT" } }, // 👈 forma correcta
              institutionName: "$institution.name",
              domain: "$institution.domain"
            }
          },
          { $skip: offset },
          { $limit: limit }
        ];
      
        const [items, total] = await Promise.all([
          this.db.collection(this.collectionName).aggregate(pipeline).toArray(),
          this.db.collection(this.collectionName).countDocuments()
        ]);
      
        return { items, total };
      }
      
           

    async getById(id: string): Promise<InstitutionAttribute | null> {
        const result = await this.db.collection(this.collectionName).findOne({ _id: new ObjectId(id) });
        return result ? { ...result, _id: result._id.toString() } as InstitutionAttribute : null;
    }

    async getByInstitutionCode(code: number): Promise<any | null> {
        const pipeline = [
          { $match: { institutionCode: code } },
          {
            $lookup: {
              from: "institutions",
              localField: "institutionCode",
              foreignField: "code",
              as: "institution"
            }
          },
          { $unwind: "$institution" },
          {
            $project: {
              institutionCode: 1,
              primaryColor: 1,
              secondaryColor: 1,
              avatar: 1,
              logo: 1,
              logoDark: 1,
              institutionName: "$institution.name"
            }
          }
        ];
      
        const result = await this.db.collection(this.collectionName).aggregate(pipeline).toArray();
        return result[0] || null;
      }
      

      async create(data: InstitutionAttribute): Promise<void> {
        const { institutionCode } = data;
      
        const institutionExists = await this.db.collection("institutions").findOne({ code: institutionCode });
        if (!institutionExists) {
          throw new Error("El código de institución no existe.");
        }
      
        const existing = await this.db.collection(this.collectionName).findOne({ institutionCode });
        if (existing) {
          throw new Error("Ya existe un atributo para esta institución.");
        }
      
        const preparedData = {
          ...data,
          _id: data._id ? new ObjectId(data._id) : undefined
        };
      
        await this.db.collection(this.collectionName).insertOne(preparedData);
      }
      
      
      async updateByInstitutionCode(code: number, data: Partial<InstitutionAttribute & { domain?: string }>): Promise<void> {
        const { institutionCode, domain, ...updateData } = data;
      
        // 1. Actualizar los atributos
        const attrUpdateResult = await this.db.collection(this.collectionName).updateOne(
          { institutionCode: code },
          { $set: updateData }
        );
      
        if (attrUpdateResult.matchedCount === 0) {
          throw new Error(`No se encontró un atributo con institutionCode ${code}`);
        }
      
        // 2. Si vino el campo `domain`, actualizarlo en la tabla institutions
        if (domain) {
          await this.db.collection("institutions").updateOne(
            { code: code },
            { $set: { domain: domain } }
          );
        }
      }
      
      

    async delete(id: string): Promise<void> {
        await this.db.collection(this.collectionName).deleteOne({ _id: new ObjectId(id) });
    }
}
