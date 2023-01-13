const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect, assert } = require("chai");
const { upgrades } = require("hardhat");

describe("Vending machine contract V1 + V2", function () {
  let proxy, upgraded, vendingMachineV1, vendingMachineV2;

  async function deployVendingMachineV1V2() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    let VendingMachineV1 = await ethers.getContractFactory("VendingMachineV1");
    proxy = await upgrades.deployProxy(VendingMachineV1, [100]);
    await proxy.deployed();

    vendingMachineV1 = await upgrades.erc1967.getImplementationAddress(
      proxy.address
    );

    // Update to V2
    const VendingMachineV2 = await ethers.getContractFactory(
      "VendingMachineV2"
    );
    upgraded = await upgrades.upgradeProxy(proxy.address, VendingMachineV2, {
      call: "initializeV2",
    });

    assert.equal(proxy.address, upgraded.address);

    vendingMachineV2 = await upgrades.erc1967.getImplementationAddress(
      upgraded.address
    );

    return { owner, addr1, addr2 };
  }

  before("Any test Vending machine", async () => {
    ({ owner, addr1, addr2 } = await loadFixture(deployVendingMachineV1V2));
  });

  describe("Deployment V1 + V2", function () {
    it("Deployment should assign default values", async function () {
      expect(await upgraded.numSodas()).to.equal(100);
    });

    it("Deployment should assign owner", async function () {
      expect(await upgraded.owner()).to.equal(owner.address);
    });
  });

  describe("Purchase sodas", function () {
    it("Should be able to purchase soda", async function () {
      expect(await ethers.provider.getBalance(upgraded.address)).to.eq(0);
      expect(await upgraded.connect(addr1).purchaseSoda({ value: 1000 })).to.be
        .ok;
      expect(await ethers.provider.getBalance(upgraded.address)).to.eq(1000);
    });

    it("Should not be able to purchase soda for less than 1000 wei", async function () {
      await expect(
        upgraded.connect(addr1).purchaseSoda({ value: 1 })
      ).to.be.revertedWith("You must pay 1000 wei for a soda!");
    });

    it("Should have 1000 balance", async function () {
      expect(await ethers.provider.getBalance(upgraded.address)).to.eq(1000);
    });
  });

  describe("Ownership", function () {
    it("Should be able to change ownership to addr2", async function () {
      await expect(upgraded.connect(owner).setNewOwner(addr2.address)).to.be.ok;
    });

    it("Should not be able to change owner again", async function () {
      await expect(
        upgraded.connect(owner).setNewOwner(addr1.address)
      ).to.be.revertedWith("Only owner can call this function.");
    });

    it("Should be able to change ownership to owner", async function () {
      expect(await upgraded.connect(addr2).setNewOwner(owner.address)).to.be.ok;
    });
  });

  describe("Withdrawal", function () {
    it("Should be able to withdraw as owner", async function () {
      expect(await ethers.provider.getBalance(upgraded.address)).to.eq(1000);
      expect(await upgraded.connect(owner).withdrawProfits()).to.be.ok;
      expect(await ethers.provider.getBalance(upgraded.address)).to.eq(0);
    });

    it("Should not be able to withdraw as another wallet", async function () {
      await expect(
        upgraded.connect(addr1).withdrawProfits()
      ).to.be.revertedWith("Only owner can call this function.");
    });
  });
});
