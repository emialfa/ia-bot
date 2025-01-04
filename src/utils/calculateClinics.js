const locationList = require("./locationList");

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en km
}

function calculateNearbyClinics(userLocation, clinics) {
  return clinics
    .filter((clinic) => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lon,
        Number(clinic.coordenadas.split(",")[0]),
        Number(clinic.coordenadas.split(",")[1])
      );
      return distance <= 100; // 100 km
    })
    .map((c) => ({ ...c, puntos: c.puntos ? c.puntos + 1 : 1 }));
}

function pointNearClinics(userLocation, clinics) {
  return clinics.map((clinic) => {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lon,
      Number(clinic.coordenadas.split(",")[0]),
      Number(clinic.coordenadas.split(",")[1])
    );
    if (distance <= 100)
      return { ...clinic, puntos: clinic.puntos ? clinic.puntos + 1 : 1 };
    return { ...clinic, puntos: clinic.puntos ? clinic.puntos : 0 };
  });
}

function calculateNationalClinics(userLocation, clinics) {
  return clinics.filter((clinic) =>
    clinic.pais.toLowerCase().includes(userLocation.pais.toLowerCase())
  );
}

const getRestClinics = (clinics, selectedClinics, languageCode) =>
  clinics.filter(
    (clinic) => !selectedClinics?.some((c) => c?.nombre[languageCode] === clinic?.nombre[languageCode])
  );

const pointCriteriaClinics = (criteria, clinics) => {
  const clinicsWithPointAdded = [];
  const pointClinics = clinics.map((clinic) => {
    let puntos = 0;
    if (criteria === "a" && clinic.cualidades.includes("calidad")) {
      puntos += 1;
    }
    if (criteria === "b" && clinic.cualidades.includes("barata")) {
      puntos += 1;
    }
    if (criteria === "d" && clinic.cualidades.includes("reputación")) {
      puntos += 1;
    }
    if (criteria === "e" && clinic.cualidades.includes("tecnología punta")) {
      puntos += 1;
    }
    if (criteria === "f" && clinic.cualidades.includes("testimonios")) {
      puntos += 1;
    }

    if (puntos) clinicsWithPointAdded.push(clinic)
    clinic.puntos = clinic.puntos ? clinic.puntos + puntos : puntos;
    return clinic;
  })

  return { pointClinics, clinicsWithPointAdded };
};

  const pointPriceClinics = (price, clinics) => clinics.map(clinic => {
    const clinicPrice = clinic.precio;
    if (price.desde <= clinicPrice.hasta && price.hasta >= clinicPrice.desde) {
      clinic.puntos = clinic.puntos ? clinic.puntos + 1 : 1;
    };
    return clinic;
  })

  const filterPriceClinics = (price, clinics) => clinics.filter(clinic => {
    const clinicPrice = clinic.precio;
    return price.desde <= clinicPrice.hasta && price.hasta >= clinicPrice.desde;
  })

// location: { lat: 40.4165, lon: -3.70256, pais: "España" }
// criteria: { key: "a", label: "Calidad y servicio" }
// price: { desde: 1000, hasta: 5000 }
// distance: "a"
function calculateClinics(userAnswers, clinicsParam, languageCode) {
  const logs = [];
  const addLog = (message, detail) => logs.push(`${message}${`${detail || ''}.`}`);
  addLog("Comienza calculo de clinicas...");
  let clinics = JSON.parse(JSON.stringify(clinicsParam));
  const { location, criteria, distance, price } = userAnswers;
  // if (!criteria) criteria = { key: "a", label: "Calidad y servicio" };
  // if (!distance) distance = "a";
  // if (!location) location = { lat: 39.9334, lon: 32.8597, pais: "Turquía" };
  // if (!price) price = { desde: 1000, hasta: 9000 };
  if (!languageCode) languageCode = "es";
  let selectedClinics = [];

  for (let i = 0; i < 3; i++) {
    clinics = getRestClinics(clinics, selectedClinics, languageCode);
    let nearedClinics = calculateNearbyClinics(location, clinics);
    let filteredClinics = [];
    if (i === 0) {
      if (nearedClinics.length === 1) {
        addLog(
          `En la iteración 1 se encontró solo 1 clinica a menos de 100km y se añadió al array de seleccionadas: `,
          nearedClinics[0].nombre[languageCode]
        );
        selectedClinics.push(nearedClinics[0]);
        continue;
      } else if (nearedClinics.length > 1) {
        filteredClinics = nearedClinics;
        addLog(
          `En la iteración 1 se encontraron ${filteredClinics.length} clinicas a menos de 100km: `,
          filteredClinics.map((c) => c.nombre[languageCode]).join(", ")
        );
      } else {
        addLog(
          "En la iteración 1 no se encontraron clinicas a menos de 100km."
        );
        let countryClinics = calculateNationalClinics(location, clinics);
        if (countryClinics.length === 1) {
          addLog(
            `En la iteración 1 se encontró solo 1 clinica dentro del pais y se añadió al array de seleccionadas: `,
            countryClinics[0].nombre[languageCode]
          );
          selectedClinics.push(countryClinics[0]);
          continue;
        } else if (countryClinics.length > 1) {
          filteredClinics = pointNearClinics(location, countryClinics);
          addLog(
            `En la iteración 1 se encontraron ${filteredClinics.length} clinicas dentro del pais: `,
            filteredClinics.map((c) => c.nombre[languageCode]).join(", ")
          );
        } else {
          filteredClinics = pointNearClinics(location, clinics);
          addLog(
            `En la iteración 1 no se encontraron clinicas dentro del país.`
          );
        }
      }
    } else {
      if (distance === "a") {
        // Cerca de mi ciudad
        if (nearedClinics.length === 1) {
          addLog(
            `En la iteración ${
              i + 1
            } se encontró 1 clinica a menos de 100km que cumple con el criterio de distancia que selecciono el usuario "Cerca de mi ciudad" y se añadió al array de seleccionadas: `,
            nearedClinics[0].nombre[languageCode]
          );
          selectedClinics.push(nearedClinics[0]);
          continue;
        } else if (nearedClinics.length > 1) {
          filteredClinics = nearedClinics;
          addLog(
            `En la iteración ${i + 1} se encontraron ${
              filteredClinics.length
            } clinicas a menos de 100km que cumplen con el criterio de distancia que selecciono el usuario "Cerca de mi ciudad": `,
            filteredClinics.map((c) => c.nombre[languageCode]).join(", ")
          );
        } else {
          addLog(
            `En la iteración ${
              i + 1
            } no se encontraron clinicas que cumplan con el criterio de distancia que selecciono el usuario "Cerca de mi ciudad".`
          );
        }
      }
      if (
        distance === "b" ||
        (distance === "a" && filteredClinics.length === 0)
      ) {
        // Dentro de mi país
        const countryClinics = calculateNationalClinics(location, clinics);
        if (countryClinics.length === 1) {
          addLog(
            `En la iteración ${i + 1} se encontró 1 clinica ${
              distance === "b"
                ? `que cumple con el criterio de distancia que selecciono el usuario "Dentro de mi país"`
                : "dentro del pais seleccionado"
            } y se añadió al array de seleccionadas: `,
            countryClinics[0].nombre[languageCode]
          );
          selectedClinics.push(countryClinics[0]);
          continue;
        } else if (countryClinics.length > 1) {
          filteredClinics = pointNearClinics(location, countryClinics);
          addLog(
            `En la iteración ${i + 1} se encontraron ${
              filteredClinics.length
            } clinicas ${
              distance === "b"
                ? `que cumplen con el criterio de distancia que selecciono el usuario "Dentro de mi país"`
                : "dentro del pais seleccionado"
            }: `,
            countryClinics.map((c) => c.nombre[languageCode]).join(", ")
          );
        } else {
          filteredClinics = pointNearClinics(location, clinics);
          addLog(
            `En la iteración ${i + 1} no se encontraron clinicas ${
              distance === "b"
                ? `que cumplan con el criterio de distancia que selecciono el usuario "Dentro de mi país".`
                : "dentro del pais seleccionado."
            }`
          );
        }
      } else if (distance === "c") {
        // Al extranjero
        filteredClinics = pointNearClinics(location, clinics);
      }
    }

    const filteredClinicsByPrice = filterPriceClinics(price, filteredClinics);
    if (filteredClinicsByPrice.length) {
      filteredClinics = filteredClinicsByPrice;
      addLog(
        `En la iteración ${
          i + 1
        } se encontraron ${filteredClinics.length} clinicas que entran en el rango de precios seleccionado "${
          price.desde
        }€ - ${
          price.hasta
        }€": `,
        filteredClinics.map((c) => c.nombre[languageCode]).join(", ")
      );
    } else {
      addLog(
        `En la iteración ${
          i + 1
        } no se encontraron clinicas que entren en el rango de precios seleccionado "${
          price.desde
        }€ - ${
          price.hasta
        }€" por lo que se desestima el filtro de precio.`
      );
    }

    const { pointClinics, clinicsWithPointAdded } = pointCriteriaClinics(criteria.key, filteredClinics);
    filteredClinics = pointClinics;
    addLog(
      `En la iteración ${
        i + 1
      } se asignó 1 punto a las clinicas que cumplen con el criterio "${
        criteria.label
      }": `,
      clinicsWithPointAdded.map((c) => `${c.nombre[languageCode]}`).join(", ")
    );

    filteredClinics.sort((a, b) => {
      if (b.puntos !== a.puntos) {
        return b.puntos - a.puntos;
      }
      return a.ranking - b.ranking;
    });

    addLog(
      `Se ha seleccionado por ranking mas bajo la clinica: `,
      filteredClinics[0].nombre[languageCode]
    );

    selectedClinics.push(filteredClinics[0]);
  }

  return {
    logs,
    response: {
      introducciónclinicas:
        languageCode === 'es' ? "Aquí tienes algunas opciones recomendadas de clínicas para tu trasplante capilar, basadas en tus preferencias y ubicación:" :
        languageCode === 'en' ? "Here are some recommended clinic options for your hair transplant, based on your preferences and location:" 
        : "Voici quelques options de cliniques recommandées pour votre greffe de cheveux, en fonction de vos préférences et de votre emplacement:",
      clinicas: selectedClinics.reduce(
        (acc, cur, i) => ({
          ...acc,
          [`clínica${i + 1}`]: {
            ...cur,
            banderas: cur.pais.split(",").flatMap((pais) => {
              if (!pais?.trim?.()?.length) return [];
              let flagUrl;
              locationList.zones.some(z => {
                const locationFlagUrl = z.locations.find((l) => l.name.toLowerCase() === pais.trim().toLowerCase())?.flagUrl;
                if (locationFlagUrl) {
                  flagUrl = locationFlagUrl;
                  return true;
                }
                return false;
              });
              return flagUrl || [];
            }),
            nombre: cur.nombre[languageCode],
            descripcion: cur.descripcion[languageCode],
            foliculos: cur.foliculos[languageCode],
            url: cur.url[languageCode],
            precio: cur.precio.desde === cur.precio.hasta ? `${cur.precio.desde}€` : `${cur.precio.desde}€ - ${cur.precio.hasta}€`,
          },
        }),
        {}
      ),
    },
  };
}

module.exports = calculateClinics;
