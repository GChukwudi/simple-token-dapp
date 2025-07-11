const SimpleToken = artifacts.require("SimpleToken");
const { expect } = require('chai');

contract("SimpleToken", (accounts) => {
  let simpleToken;
  const [owner, addr1, addr2] = accounts;
  const initialSupply = 1000000;

  beforeEach(async () => {
    simpleToken = await SimpleToken.new(initialSupply);
  });

  describe("Deployment", () => {
    it("should set the right owner", async () => {
      const ownerBalance = await simpleToken.balanceOf(owner);
      const expectedBalance = web3.utils.toWei(initialSupply.toString(), 'ether');
      expect(ownerBalance.toString()).to.equal(expectedBalance);
    });

    it("should assign the total supply of tokens to the owner", async () => {
      const ownerBalance = await simpleToken.balanceOf(owner);
      const totalSupply = await simpleToken.totalSupply();
      expect(ownerBalance.toString()).to.equal(totalSupply.toString());
    });

    it("should have correct token details", async () => {
      const name = await simpleToken.name();
      const symbol = await simpleToken.symbol();
      const decimals = await simpleToken.decimals();
      
      expect(name).to.equal("SimpleToken");
      expect(symbol).to.equal("STK");
      expect(decimals.toString()).to.equal("18");
    });
  });

  describe("Transactions", () => {
    it("should transfer tokens between accounts", async () => {
      const transferAmount = web3.utils.toWei("50", "ether");
      
      // Transfer 50 tokens from owner to addr1
      await simpleToken.transfer(addr1, transferAmount, { from: owner });
      const addr1Balance = await simpleToken.balanceOf(addr1);
      expect(addr1Balance.toString()).to.equal(transferAmount);

      // Transfer 50 tokens from addr1 to addr2
      await simpleToken.transfer(addr2, transferAmount, { from: addr1 });
      const addr2Balance = await simpleToken.balanceOf(addr2);
      expect(addr2Balance.toString()).to.equal(transferAmount);
    });

    it("should fail if sender doesn't have enough tokens", async () => {
      const transferAmount = web3.utils.toWei("100", "ether");
      
      try {
        await simpleToken.transfer(owner, transferAmount, { from: addr1 });
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("Insufficient balance");
      }
    });

    it("should update balances after transfers", async () => {
      const initialOwnerBalance = await simpleToken.balanceOf(owner);
      const transferAmount = web3.utils.toWei("100", "ether");

      // Transfer 100 tokens from owner to addr1
      await simpleToken.transfer(addr1, transferAmount, { from: owner });

      // Check balances
      const finalOwnerBalance = await simpleToken.balanceOf(owner);
      const expectedOwnerBalance = web3.utils.toBN(initialOwnerBalance).sub(web3.utils.toBN(transferAmount));
      expect(finalOwnerBalance.toString()).to.equal(expectedOwnerBalance.toString());

      const addr1Balance = await simpleToken.balanceOf(addr1);
      expect(addr1Balance.toString()).to.equal(transferAmount);
    });

    it("should emit Transfer events", async () => {
      const transferAmount = web3.utils.toWei("50", "ether");
      
      const result = await simpleToken.transfer(addr1, transferAmount, { from: owner });
      
      // Check if Transfer event was emitted
      const transferEvent = result.logs.find(log => log.event === 'Transfer');
      expect(transferEvent).to.exist;
      expect(transferEvent.args.from).to.equal(owner);
      expect(transferEvent.args.to).to.equal(addr1);
      expect(transferEvent.args.value.toString()).to.equal(transferAmount);
    });

    it("should fail when transferring to zero address", async () => {
      const transferAmount = web3.utils.toWei("50", "ether");
      
      try {
        await simpleToken.transfer("0x0000000000000000000000000000000000000000", transferAmount, { from: owner });
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("Cannot transfer to zero address");
      }
    });
  });

  describe("Allowances", () => {
    it("should approve and transferFrom correctly", async () => {
      const approveAmount = web3.utils.toWei("100", "ether");
      const transferAmount = web3.utils.toWei("50", "ether");

      // Owner approves addr1 to spend 100 tokens
      await simpleToken.approve(addr1, approveAmount, { from: owner });
      
      // Check allowance
      const allowance = await simpleToken.allowance(owner, addr1);
      expect(allowance.toString()).to.equal(approveAmount);

      // addr1 transfers 50 tokens from owner to addr2
      await simpleToken.transferFrom(owner, addr2, transferAmount, { from: addr1 });
      
      // Check balances
      const addr2Balance = await simpleToken.balanceOf(addr2);
      expect(addr2Balance.toString()).to.equal(transferAmount);
      
      // Check remaining allowance
      const remainingAllowance = await simpleToken.allowance(owner, addr1);
      const expectedAllowance = web3.utils.toBN(approveAmount).sub(web3.utils.toBN(transferAmount));
      expect(remainingAllowance.toString()).to.equal(expectedAllowance.toString());
    });

    it("should fail transferFrom without sufficient allowance", async () => {
      const transferAmount = web3.utils.toWei("50", "ether");
      
      try {
        await simpleToken.transferFrom(owner, addr2, transferAmount, { from: addr1 });
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("Insufficient allowance");
      }
    });

    it("should emit Approval events", async () => {
      const approveAmount = web3.utils.toWei("100", "ether");
      
      const result = await simpleToken.approve(addr1, approveAmount, { from: owner });
      
      // Check if Approval event was emitted
      const approvalEvent = result.logs.find(log => log.event === 'Approval');
      expect(approvalEvent).to.exist;
      expect(approvalEvent.args.owner).to.equal(owner);
      expect(approvalEvent.args.spender).to.equal(addr1);
      expect(approvalEvent.args.value.toString()).to.equal(approveAmount);
    });
  });

  describe("Minting", () => {
    it("should mint tokens correctly", async () => {
      const mintAmount = web3.utils.toWei("500", "ether");
      const initialBalance = await simpleToken.balanceOf(addr1);
      const initialTotalSupply = await simpleToken.totalSupply();

      await simpleToken.mint(addr1, mintAmount, { from: owner });

      const finalBalance = await simpleToken.balanceOf(addr1);
      const finalTotalSupply = await simpleToken.totalSupply();
      
      const expectedBalance = web3.utils.toBN(initialBalance).add(web3.utils.toBN(mintAmount));
      const expectedTotalSupply = web3.utils.toBN(initialTotalSupply).add(web3.utils.toBN(mintAmount));
      
      expect(finalBalance.toString()).to.equal(expectedBalance.toString());
      expect(finalTotalSupply.toString()).to.equal(expectedTotalSupply.toString());
    });

    it("should emit Transfer event when minting", async () => {
      const mintAmount = web3.utils.toWei("500", "ether");
      
      const result = await simpleToken.mint(addr1, mintAmount, { from: owner });
      
      // Check if Transfer event was emitted
      const transferEvent = result.logs.find(log => log.event === 'Transfer');
      expect(transferEvent).to.exist;
      expect(transferEvent.args.from).to.equal("0x0000000000000000000000000000000000000000");
      expect(transferEvent.args.to).to.equal(addr1);
      expect(transferEvent.args.value.toString()).to.equal(mintAmount);
    });

    it("should fail when minting to zero address", async () => {
      const mintAmount = web3.utils.toWei("500", "ether");
      
      try {
        await simpleToken.mint("0x0000000000000000000000000000000000000000", mintAmount, { from: owner });
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("Cannot mint to zero address");
      }
    });
  });

  describe("Gas Usage", () => {
    it("should report gas usage for transfers", async () => {
      const transferAmount = web3.utils.toWei("100", "ether");
      
      const result = await simpleToken.transfer(addr1, transferAmount, { from: owner });
      console.log("Gas used for transfer:", result.receipt.gasUsed);
      
      // Gas usage should be reasonable (less than 100,000 gas)
      expect(result.receipt.gasUsed).to.be.below(100000);
    });

    it("should report gas usage for approvals", async () => {
      const approveAmount = web3.utils.toWei("100", "ether");
      
      const result = await simpleToken.approve(addr1, approveAmount, { from: owner });
      console.log("Gas used for approval:", result.receipt.gasUsed);
      
      // Gas usage should be reasonable (less than 50,000 gas)
      expect(result.receipt.gasUsed).to.be.below(50000);
    });
  });
});