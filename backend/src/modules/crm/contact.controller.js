import { createTenantContact, findContactsByTenant } from "./crm.service.js";

export const listContacts = async (req, res) => {
  try {
    const contacts = await findContactsByTenant(req.user.tenantId);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createContact = async (req, res) => {
  try {
    const contact = await createTenantContact(req.user.tenantId, req.body);
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};