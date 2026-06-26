import { CheckoutService } from '../src/services/CheckoutService.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { Item } from '../src/domain/Item.js';
import { Pedido } from '../src/domain/Pedido.js';

// Cenário: FALHA NO PAGAMENTO (Padrão Stub)

describe('CheckoutService', () => {
    describe('quando o pagamento falha', () => {
        it('deve retornar null e não salvar o pedido nem enviar e-mail', async () => {

            const carrinho = new CarrinhoBuilder().build();
            const cartaoCredito = { numero: '1111-2222-3333-4444' };

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: false }),
            };

            const repositoryDummy = { salvar: jest.fn() };
            const emailDummy = { enviarEmail: jest.fn() };

            const service = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

            const pedido = await service.processarPedido(carrinho, cartaoCredito);

            expect(pedido).toBeNull();
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(100, cartaoCredito);
        });
    });

    // Cenário: SUCESSO – CLIENTE PREMIUM (Padrão Mock)

    describe('quando um cliente Premium finaliza a compra', () => {
        it('deve aplicar 10% de desconto, salvar o pedido e enviar e-mail de confirmação', async () => {

            const usuarioPremium = UserMother.umUsuarioPremium();

            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comItens([new Item('Notebook', 100), new Item('Mouse', 100)])
                .build();

            const cartaoCredito = { numero: '9999-8888-7777-6666' };

            const pedidoSalvoFake = new Pedido(42, carrinho, 180, 'PROCESSADO');

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true }),
            };

            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(pedidoSalvoFake),
            };

            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(undefined),
            };

            const service = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            const pedidoResultante = await service.processarPedido(carrinho, cartaoCredito);

            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartaoCredito);
            expect(repositoryStub.salvar).toHaveBeenCalledWith(
                expect.objectContaining({ totalFinal: 180, status: 'PROCESSADO' })
            );
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                expect.stringContaining('42')
            );
            expect(pedidoResultante).toEqual(pedidoSalvoFake);
        });
    });
});