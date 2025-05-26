import { prisma } from "@/lib/prisma";

// 📘 GET - Obtenir un événement (public)
export async function GET(request, context) {
  const id = parseInt(context.params.id);

  try {
    const evenement = await prisma.evenement.findUnique({
      where: { id },
    });

    if (!evenement) {
      return new Response(JSON.stringify({ error: "Événement non trouvé" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(evenement), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erreur GET événement :", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ✏️ PATCH - Modifier un événement (admin uniquement)
export async function PATCH(request, context) {
  const id = parseInt(context.params.id);
  const data = await request.json();

  try {
    const evenement = await prisma.evenement.update({
      where: { id },
      data,
    });

    return new Response(JSON.stringify(evenement), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erreur PATCH événement :", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// 🗑️ DELETE - Supprimer un événement (admin uniquement)
export async function DELETE(request, context) {
  const id = parseInt(context.params.id);

  try {
    await prisma.evenement.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ message: "Événement supprimé" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erreur DELETE événement :", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
