# Cash Fighter - Payment Processing v1

Esse repo tem como objetivo fazer um projeto de backend que faz as requisições para meios de pagamentos de forma assincrona para a [*Rinha de backend 2025*](https://github.com/zanfranceschi/rinha-de-backend-2025).

## Stack / Arquitetura

- Bun / TypeScript
- Redis database
- Redis fila
- Nginx Load Balancer

┌──────────────┐       ┌─────────┐       ┌──────────┐       ┌───────────────┐
│   Cliente    │       │   API   │       │  Redis   │       │   Worker      │
└──────┬───────┘       └────┬────┘       └────┬─────┘       └───────┬───────┘
       │ POST /payments     │                 │                     │
       │───────────────────>│                 │                     │
       │                    │ Enfileira       │                     │
       │                    │───────[payment]─>                     │
       │                    │                 │                     │
       │                    │                 │  Worker (consome)   │
       │                    │                 │<───[payment queue]──│
       │                    │                 │                     │
       │                    │                 │  Processa com:      │
       │                    │                 │  - Processor default│
       │                    │                 │  - Processor fallback
       │                    │                 │                     │
       │ GET /payments-summary                │                     │
       │───────────────────>│                 │                     │
       │     Resumo         │                 │                     │
       │<───────────────────┤                 │                     │
       │                    │                 │                     │
       │                    │ Health Check    │                     │
       │                    │──[Redis: 5s]───>│                     │
       │                    │                 │                     │
┌──────┴───────┐       ┌────┴────┐       ┌────┴─────┐       ┌───────┴───────┐
│              │       │         │       │          │       │               │
│              │       │         │       │          │       │               │


flowchart TD
    subgraph Cliente
        C[Cliente]
    end

    subgraph API["API (Serviço Web)"]
        direction TB
        POST["POST /payments"]
        GET_Summary["GET /payments-summary"]
        Health["GET /service-health"]
        RedisCheck[Redis Health Check 5s]
    end

    subgraph Redis["Redis"]
        direction LR
        Queue[Payment Queues]
        SummaryData[Summary Data]
    end

    subgraph Workers["Worker Service"]
        direction TB
        Worker1[Worker]
        Worker2[Worker]
        ProcessorDefault["Processor: Default"]
        ProcessorFallback["Processor: Fallback"]
    end

    C -->|1. Envia pagamento| POST
    POST -->|2. Enfileira| Queue
    Queue -->|3. Consome| Worker1
    Queue -->|4. Consome| Worker2

    Worker1 -->|5. Processa com| ProcessorDefault
    Worker2 -->|6. Processa com| ProcessorDefault
    ProcessorDefault -->|7. Falha?| ProcessorFallback
    Workers -->|8. Atualiza dados| SummaryData

    C -->|9. Solicita resumo| GET_Summary
    GET_Summary -->|10. Lê dados| SummaryData
    SummaryData -->|11. Retorna resumo| C

    API -->|12. Health Check| Redis
    C -->|13. Verifica saúde| Health
    Health -->|14. Status API| C