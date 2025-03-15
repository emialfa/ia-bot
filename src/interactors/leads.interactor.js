const leadRepository = require("../repositories/leads.repository.js");

const createLeads = async (leads) => {
  try {
    const leadsCreated = await leadRepository.createLeads(leads);
    return leadsCreated;
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
};

const findByPhoneAndName = async (lead) => {
  try {
    if (!lead?.phone) return null;

    // Obtener los últimos 6 dígitos del teléfono del objeto
    const phoneSubstring = lead.phone?.slice(-6); // O usando substring(obj.telefono.length - 6)

    // Realizar la consulta en la base de datos
    let leads = await leadRepository.findByLastPhoneDigits(phoneSubstring);

    // Filtrar los usuarios por 'name' si es necesario
    if (leads?.length > 1 && lead?.name) {
      const leadsFiltered = leads?.filter((l) => l.name === lead?.name);
      if (leadsFiltered?.length) leads = leadsFiltered;
    }

    // Si hay coincidencias, agregar al resultado
    return leads?.[0] || null;

  } catch (error) {
    console.error("Error al buscar lead:", error);
    return null;
  }
};

module.exports = { findByPhoneAndName, createLeads };
