/**
 * ROSA DI FIORE - ESTÉTICA & BEM-ESTAR DOMICILIAR
 * Sistema de Navegação SPA e Agendamento Online Integrado ao Google Planilhas / WhatsApp
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Efeito de Scroll no Header
    const header = document.getElementById("header");
    window.addEventListener("scroll", () => {
        if (header) {
            if (window.scrollY > 30) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
        }
    });

    // 2. Menu Mobile Interativo
    const menuToggle = document.getElementById("mobile-menu-btn");
    const nav = document.getElementById("main-nav");
    if (menuToggle && nav) {
        menuToggle.addEventListener("click", () => {
            nav.classList.toggle("active");
            const icon = menuToggle.querySelector("i");
            if (icon) {
                if (nav.classList.contains("active")) {
                    icon.classList.remove("fa-bars");
                    icon.classList.add("fa-xmark");
                } else {
                    icon.classList.remove("fa-xmark");
                    icon.classList.add("fa-bars");
                }
            }
        });

        // Fecha menu mobile ao clicar em qualquer link
        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                nav.classList.remove("active");
                const icon = menuToggle.querySelector("i");
                if (icon) {
                    icon.classList.remove("fa-xmark");
                    icon.classList.add("fa-bars");
                }
            });
        });
    }

    // 3. Bloqueio de datas passadas no seletor de agendamento
    const inputData = document.getElementById("data");
    if (inputData) {
        const hoje = new Date().toISOString().split("T")[0];
        inputData.min = hoje;
        inputData.addEventListener("change", atualizarHorariosDisponiveis);
    }

    const selectServico = document.getElementById("servico");
    if (selectServico) {
        selectServico.addEventListener("change", atualizarHorariosDisponiveis);
    }

    // 4. Máscara amigável de WhatsApp: (XX) XXXXX-XXXX
    const inputWhatsapp = document.getElementById("whatsapp");
    if (inputWhatsapp) {
        inputWhatsapp.addEventListener("input", function () {
            let v = this.value.replace(/\D/g, "");
            if (v.length > 11) v = v.slice(0, 11);

            if (v.length > 6) {
                this.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
            } else if (v.length > 2) {
                this.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
            } else if (v.length > 0) {
                this.value = `(${v}`;
            } else {
                this.value = "";
            }
        });
    }

    // 5. Submissão do Formulário de Agendamento
    const formAgendamento = document.getElementById("form-agendamento");
    if (formAgendamento) {
        formAgendamento.addEventListener("submit", function (e) {
            e.preventDefault();

            const msgErro = document.getElementById("msg-erro");
            if (msgErro) msgErro.style.display = "none";

            const horarioEscolhido = document.getElementById("horario-selecionado") ? document.getElementById("horario-selecionado").value : "";
            if (!horarioEscolhido) {
                if (msgErro) {
                    msgErro.innerText = "Por favor, selecione um dos horários disponíveis na grade acima.";
                    msgErro.style.display = "block";
                }
                return;
            }

            const btnSubmit = document.getElementById("btn-submit");
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirmando agendamento...';
            }

            const nome = document.getElementById("nome").value.trim();
            const whatsapp = document.getElementById("whatsapp").value.trim();
            const servico = document.getElementById("servico").value;
            const data = inputData.value;

            const payload = {
                ID: "AGD-" + Date.now(),
                Data: data,
                Horario: horarioEscolhido,
                Nome: nome,
                WhatsApp: whatsapp,
                Servico: servico,
                Status: "Pendente"
            };

            // Formatação padrão brasileira (DD/MM/AAAA)
            const partesData = data.split("-");
            const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : data;

            const mensagemWhatsApp = `Olá! Gostaria de confirmar meu agendamento pelo site Rosa di Fiore:
*Nome:* ${nome}
*Serviço:* ${servico}
*Data:* ${dataFormatada}
*Horário:* ${horarioEscolhido}
*WhatsApp:* ${whatsapp}`;

            // Envio para o Google Apps Script CRM
            fetch(scriptURL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            })
                .then(() => {
                    finalizarAgendamento(true, mensagemWhatsApp);
                })
                .catch((error) => {
                    console.warn("Aviso ao registrar na planilha:", error);
                    // Redireciona para o WhatsApp para garantir que o cliente não se perca
                    finalizarAgendamento(false, mensagemWhatsApp);
                });
        });
    }
});

// URL Oficial do Google Apps Script CRM da Anne (Rosa di Fiore)
const scriptURL = "https://script.google.com/macros/s/AKfycbyifTvjxTwbB2Bd5WVHL_Uu2IPtlRTEDK64DmK27fDdkSZ6o5TrO-gKD6jFNire439I/exec";

// Grade base de horários de atendimento (09:00 às 18:00)
const horariosBase = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

// Converte qualquer formato ("09:00:00", "09:00", "9:00", "9h", "9h30") para "09:00"
function normalizarHora(horaStr) {
    if (!horaStr) return "";
    const match = String(horaStr).match(/(\d{1,2})(?::(\d{2})|h(\d{2})?|h)?/i);
    if (match) {
        const h = match[1].padStart(2, "0");
        const m = (match[2] || match[3] || "00").padStart(2, "0");
        return `${h}:${m}`;
    }
    return String(horaStr).trim();
}

// Converte string de hora ("09:30", "12h", "11", "9:00") para minutos a partir da meia-noite (ex: 570)
function horaParaMinutos(horaStr) {
    if (!horaStr) return -1;
    const match = String(horaStr).match(/(\d{1,2})(?::(\d{2})|h(\d{2})?|h)?/i);
    if (!match) return -1;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2] || match[3] || "0", 10);
    return h * 60 + m;
}

// Expande horários ocupados suportando intervalos (ex: "09:00 - 11:00", "09:00 - 12h", ou coluna Termino)
function expandirHorariosOcupados(dados) {
    const ocupados = new Set();
    if (!Array.isArray(dados)) return [];

    dados.forEach((item) => {
        if (!item) return;

        if (typeof item !== "object") {
            const h = normalizarHora(item);
            if (h) ocupados.add(h);
            return;
        }

        // Bloqueia APENAS quando o status for confirmado com OK (ou Confirmado/Aprovado/Sim)
        // Enquanto estiver "Pendente", o horário continua liberado para outros clientes
        const statusValido = statusStr === "OK" || statusStr === "CONFIRMADO" || statusStr === "APROVADO" || statusStr === "SIM";
        if (!statusValido) return;

        const horarioStr = String(item.Horario || "").trim();
        const terminoStr = String(item.Termino || item.Fim || item.Horario_Fim || item.Termino_Horario || "").trim();

        let inicioMin = -1;
        let fimMin = -1;

        // 1. Verifica se há intervalo explícito na célula de Horário: "09:00 - 11:00", "09:00 - 12h", "09:00 às 11:00"
        const rangeMatch = horarioStr.match(/(\d{1,2}(?::\d{2}|h\d{2}|h)?)\s*(?:-|–|—|às|as|até|ate|a)\s*(\d{1,2}(?::\d{2}|h\d{2}|h)?)/i);
        if (rangeMatch) {
            inicioMin = horaParaMinutos(rangeMatch[1]);
            fimMin = horaParaMinutos(rangeMatch[2]);
        } else if (terminoStr) {
            // 2. Se houver coluna de Término / Fim preenchida
            inicioMin = horaParaMinutos(horarioStr);
            fimMin = horaParaMinutos(terminoStr);
        } else {
            // 3. Apenas horário inicial (ex: "09:00")
            inicioMin = horaParaMinutos(horarioStr);
            if (inicioMin >= 0) {
                // Bloqueia preventivamente a janela de 1 hora para evitar sobreposição imediata
                fimMin = inicioMin + 60;
            }
        }

        if (inicioMin >= 0 && fimMin > inicioMin) {
            // Bloqueia todos os slots da grade que caiam no intervalo [inicioMin, fimMin)
            horariosBase.forEach((slot) => {
                const slotMin = horaParaMinutos(slot);
                if (slotMin >= inicioMin && slotMin < fimMin) {
                    ocupados.add(slot);
                }
            });
        } else if (inicioMin >= 0) {
            const h = normalizarHora(horarioStr);
            if (h) ocupados.add(h);
        }
    });

    return Array.from(ocupados);
}

// Consulta em tempo real na planilha e renderiza os horários disponíveis e bloqueados
function atualizarHorariosDisponiveis() {
    const selectServico = document.getElementById("servico");
    const inputData = document.getElementById("data");
    const gradeHorarios = document.getElementById("grade-horarios");
    const avisoFiltro = document.getElementById("filtro-aviso");
    const inputHorarioSelecionado = document.getElementById("horario-selecionado");
    const msgErro = document.getElementById("msg-erro");

    if (!selectServico || !inputData || !gradeHorarios || !avisoFiltro) return;

    const servicoVal = selectServico.value;
    const dataVal = inputData.value;

    if (msgErro) msgErro.style.display = "none";

    if (!servicoVal || !dataVal) {
        avisoFiltro.style.display = "block";
        avisoFiltro.textContent = "Selecione o serviço e a data acima para exibir os horários disponíveis.";
        gradeHorarios.style.display = "none";
        gradeHorarios.innerHTML = "";
        if (inputHorarioSelecionado) inputHorarioSelecionado.value = "";
        return;
    }

    avisoFiltro.style.display = "block";
    avisoFiltro.textContent = "Consultando horários disponíveis na agenda...";
    gradeHorarios.style.display = "none";
    if (inputHorarioSelecionado) inputHorarioSelecionado.value = "";

    fetch(`${scriptURL}?data=${dataVal}`)
        .then((response) => response.json())
        .then((dadosRetornados) => {
            avisoFiltro.style.display = "none";
            gradeHorarios.style.display = "grid";
            gradeHorarios.innerHTML = "";

            const horariosOcupados = expandirHorariosOcupados(dadosRetornados);

            horariosBase.forEach((h) => {
                const slot = document.createElement("div");
                slot.className = "horario-slot";
                slot.textContent = h;

                if (horariosOcupados.includes(h)) {
                    slot.classList.add("booked");
                    slot.title = "Horário já reservado na agenda";
                } else {
                    slot.addEventListener("click", function () {
                        document.querySelectorAll(".horario-slot").forEach((s) => s.classList.remove("selected"));
                        slot.classList.add("selected");
                        if (inputHorarioSelecionado) inputHorarioSelecionado.value = h;
                        if (msgErro) msgErro.style.display = "none";
                    });
                }

                gradeHorarios.appendChild(slot);
            });
        })
        .catch((error) => {
            console.warn("Consulta offline ou erro na API:", error);
            avisoFiltro.style.display = "none";
            gradeHorarios.style.display = "grid";
            gradeHorarios.innerHTML = "";

            // Em caso de falha de conexão com a API, disponibiliza os horários para não travar o cliente
            horariosBase.forEach((h) => {
                const slot = document.createElement("div");
                slot.className = "horario-slot";
                slot.textContent = h;
                slot.addEventListener("click", function () {
                    document.querySelectorAll(".horario-slot").forEach((s) => s.classList.remove("selected"));
                    slot.classList.add("selected");
                    if (inputHorarioSelecionado) inputHorarioSelecionado.value = h;
                    if (msgErro) msgErro.style.display = "none";
                });
                gradeHorarios.appendChild(slot);
            });
        });
}

// Abre a visualização do agendamento (experiência fluida tipo SPA)
function abrirAgendamento(servico = "") {
    const conteudoPrincipal = document.getElementById("conteudo-principal");
    const agendamento = document.getElementById("agendamento");

    if (conteudoPrincipal && agendamento) {
        conteudoPrincipal.style.display = "none";
        agendamento.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (servico) {
        const selectServico = document.getElementById("servico");
        if (selectServico) {
            selectServico.value = servico;
            atualizarHorariosDisponiveis();
        }
    }

    const nav = document.getElementById("main-nav");
    if (nav) nav.classList.remove("active");
    const menuToggle = document.getElementById("mobile-menu-btn");
    if (menuToggle) {
        const icon = menuToggle.querySelector("i");
        if (icon) {
            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");
        }
    }
}

// Fecha o agendamento e retorna suavemente para a página inicial
function fecharAgendamento() {
    const conteudoPrincipal = document.getElementById("conteudo-principal");
    const agendamento = document.getElementById("agendamento");

    if (conteudoPrincipal && agendamento) {
        conteudoPrincipal.style.display = "block";
        agendamento.style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const nav = document.getElementById("main-nav");
    if (nav) nav.classList.remove("active");
    const menuToggle = document.getElementById("mobile-menu-btn");
    if (menuToggle) {
        const icon = menuToggle.querySelector("i");
        if (icon) {
            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");
        }
    }
}

// Finalização do agendamento e redirecionamento para o WhatsApp da Anne
function finalizarAgendamento(sucesso, mensagem) {
    const btnSubmit = document.getElementById("btn-submit");
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar Agendamento';
    }

    const waLink = `https://wa.me/5511947050565?text=${encodeURIComponent(mensagem)}`;
    window.open(waLink, "_blank");

    const formAgendamento = document.getElementById("form-agendamento");
    if (formAgendamento) {
        formAgendamento.reset();
    }

    const gradeHorarios = document.getElementById("grade-horarios");
    if (gradeHorarios) {
        gradeHorarios.style.display = "none";
        gradeHorarios.innerHTML = "";
    }

    const avisoFiltro = document.getElementById("filtro-aviso");
    if (avisoFiltro) {
        avisoFiltro.style.display = "block";
        avisoFiltro.textContent = "Selecione o serviço e a data acima para exibir os horários disponíveis.";
    }

    const inputHorarioSelecionado = document.getElementById("horario-selecionado");
    if (inputHorarioSelecionado) {
        inputHorarioSelecionado.value = "";
    }

    fecharAgendamento();
}
