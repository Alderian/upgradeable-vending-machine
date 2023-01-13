const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("Vending machine contract V1", function () {
  let proxy, vendingMachineV1;

  async function deployVendingMachineV1() {
    const [owner, addr1] = await ethers.getSigners();

    let VendingMachineV1 = await ethers.getContractFactory("VendingMachineV1");
    proxy = await upgrades.deployProxy(VendingMachineV1, [100]);
    await proxy.deployed();

    vendingMachineV1 = await upgrades.erc1967.getImplementationAddress(
      proxy.address
    );

    return { owner, addr1 };
  }

  before("Any test Vending machine", async () => {
    ({ owner, addr1 } = await loadFixture(deployVendingMachineV1));
  });

  describe("Deployment", function () {
    it("Deployment should assign default values", async function () {
      expect(await proxy.numSodas()).to.equal(100);
    });
  });

  describe("Purchase sodas", function () {
    it("Should be able to purchase soda", async function () {
      expect(await proxy.connect(addr1).purchaseSoda({ value: 1000 })).to.be.ok;
    });

    it("Should not be able to purchase soda for less than 1000 wei", async function () {
      await expect(
        proxy.connect(addr1).purchaseSoda({ value: 1 })
      ).to.be.revertedWith("You must pay 1000 wei for a soda!");
    });
  });
});
